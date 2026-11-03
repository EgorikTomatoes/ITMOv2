import * as vscode from "vscode";

import { runTranslationCommand, type EditorApi } from "./command";
import {
  createOllamaTranslator,
  type OllamaSettings,
  type VariableStyle
} from "./ollama";
import { ensureOllamaRunning, type PreflightAction, type PreflightUi } from "./preflight/orchestrator";
import type { ErrorCode } from "./preflight/types";
import { createNodeProcessRunner } from "./process/ollamaRunner";

const COMMAND_ID = "variableTranslator.translateAtCursor";
const CONFIGURATION_SECTION = "russianVariableTranslator";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(COMMAND_ID, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage("Откройте файл в редакторе, чтобы вставить имя переменной.");
      return;
    }

    // Прежде чем запрашивать текст, выполним префлайт-проверку
    const settings = readSettings();
    const ok = await ensureOllamaRunning({
      fetcher: globalThis.fetch,
      baseUrl: settings.baseUrl,
      runner: createNodeProcessRunner(),
      isMacOS: process.platform === "darwin",
      ui: createPreflightUi()
    });
    if (!ok) {
      return;
    }
    const styleOptions: Array<vscode.QuickPickItem & { value: VariableStyle }> = [
      { label: "snake", description: "snake_case", value: "snake", picked: settings.style === "snake" },
      { label: "camel", description: "camelCase", value: "camel", picked: settings.style === "camel" },
      { label: "pascal", description: "PascalCase", value: "pascal", picked: settings.style === "pascal" },
      { label: "constant", description: "UPPER_SNAKE_CASE", value: "constant", picked: settings.style === "constant" }
    ];

    const picked = await vscode.window.showQuickPick(styleOptions, {
      title: "Стиль переменной",
      placeHolder: "Выберите стиль форматирования имени переменной",
      ignoreFocusOut: true,
      canPickMany: false
    });

    // Отмена выбора стиля отменяет всю команду
    if (!picked) {
      return;
    }

    const chosenStyle = picked.value;
    const editorApi = createEditorApi(editor);
    const translator = createOllamaTranslator(globalThis.fetch, { ...settings, style: chosenStyle });
    await runTranslationCommand(editorApi, translator);
  });

  context.subscriptions.push(disposable);
}

export function deactivate(): void {
  // VS Code disposes registrations stored in the extension context.
}

function readSettings(): OllamaSettings {
  const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
  return {
    baseUrl: configuration.get<string>("ollamaUrl", "http://localhost:11434"),
    model: configuration.get<string>("model", "variable-translator"),
    style: configuration.get<VariableStyle>("style", "snake")
  };
}

function createEditorApi(editor: vscode.TextEditor): EditorApi {
  return {
    askForText: () =>
      vscode.window.showInputBox({
        title: "Перевод в имя переменной",
        prompt: "Введите русское предложение",
        placeHolder: "Количество активных пользователей",
        ignoreFocusOut: true
      }),
    getCursor: () => ({
      line: editor.selection.active.line,
      character: editor.selection.active.character
    }),
    insertAtCursor: (text, position) =>
      editor.edit((edit) => edit.insert(new vscode.Position(position.line, position.character), text)),
    showError: (message) => {
      void vscode.window.showErrorMessage(message);
    }
  };
}

function createPreflightUi(): PreflightUi {
  return {
    runCheck: (task) => withCancellableProgress("Проверка Ollama…", task),
    runStart: (task) => withCancellableProgress("Ollama запускается…", task),
    async chooseAction(status): Promise<PreflightAction> {
      const actions: Array<vscode.QuickPickItem & { value: PreflightAction }> = [];
      if (
        status.canStartLocal &&
        (status.state === "stopped" || status.errorCode === "network-error")
      ) {
        actions.push({ label: "$(play) Запустить Ollama", value: "start" });
      }
      actions.push({ label: "$(refresh) Повторить проверку", value: "retry" });
      actions.push({ label: "$(close) Отмена", value: "cancel" });

      const choice = await vscode.window.showQuickPick(actions, {
        title: "Ollama недоступна",
        placeHolder: status.state === "stopped"
          ? "Ollama не запущена"
          : mapErrorMessage(status.errorCode),
        canPickMany: false,
        ignoreFocusOut: true
      });
      return choice?.value ?? "cancel";
    },
    showRunning(): void {
      void vscode.window.showInformationMessage("Ollama запущена и готова к работе.");
    },
    showError(errorCode): void {
      void vscode.window.showErrorMessage(mapErrorMessage(errorCode));
    }
  };
}

async function withCancellableProgress<T>(
  title: string,
  task: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  return await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title,
    cancellable: true
  }, async (_progress, token) => {
    const controller = new AbortController();
    const subscription = token.onCancellationRequested(() => controller.abort());
    try {
      return await task(controller.signal);
    } finally {
      subscription.dispose();
    }
  });
}

function mapErrorMessage(code?: ErrorCode): string {
  switch (code) {
    case "health-timeout": return "Проверка Ollama заняла слишком долго";
    case "http-error": return "Ollama недоступна";
    case "network-error": return "Не удалось подключиться к Ollama";
    case "start-timeout": return "Ollama не запустилась вовремя";
    case "start-failed": return "Не удалось запустить Ollama";
    case "port-busy": return "Порт Ollama занят";
    case "ollama-not-found": return "Команда ‘ollama’ не найдена";
    case "unsupported-platform": return "Автозапуск Ollama недоступен на этой платформе";
    default: return "Ollama недоступна";
  }
}
