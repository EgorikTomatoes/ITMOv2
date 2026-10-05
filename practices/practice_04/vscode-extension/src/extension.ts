import * as vscode from "vscode";

import { runTranslationCommand, type EditorApi } from "./command";
import {
  createOllamaTranslator,
  type OllamaSettings,
  type VariableStyle
} from "./ollama";

const COMMAND_ID = "variableTranslator.translateAtCursor";
const CONFIGURATION_SECTION = "russianVariableTranslator";

export function activate(context: vscode.ExtensionContext): void {
  const disposable = vscode.commands.registerCommand(COMMAND_ID, async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showErrorMessage("Откройте файл в редакторе, чтобы вставить имя переменной.");
      return;
    }

    const editorApi = createEditorApi(editor);
    const translator = createOllamaTranslator(globalThis.fetch, readSettings());
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
