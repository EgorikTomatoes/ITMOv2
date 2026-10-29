"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const command_1 = require("./command");
const ollama_1 = require("./ollama");
const orchestrator_1 = require("./preflight/orchestrator");
const ollamaRunner_1 = require("./process/ollamaRunner");
const COMMAND_ID = "variableTranslator.translateAtCursor";
const CONFIGURATION_SECTION = "russianVariableTranslator";
function activate(context) {
    const disposable = vscode.commands.registerCommand(COMMAND_ID, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showErrorMessage("Откройте файл в редакторе, чтобы вставить имя переменной.");
            return;
        }
        // Прежде чем запрашивать текст, выполним префлайт-проверку
        const settings = readSettings();
        const ok = await (0, orchestrator_1.ensureOllamaRunning)({
            fetcher: globalThis.fetch,
            baseUrl: settings.baseUrl,
            runner: (0, ollamaRunner_1.createNodeProcessRunner)(),
            isMacOS: process.platform === "darwin",
            ui: createPreflightUi()
        });
        if (!ok) {
            return;
        }
        const styleOptions = [
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
        const translator = (0, ollama_1.createOllamaTranslator)(globalThis.fetch, { ...settings, style: chosenStyle });
        await (0, command_1.runTranslationCommand)(editorApi, translator);
    });
    context.subscriptions.push(disposable);
}
function deactivate() {
    // VS Code disposes registrations stored in the extension context.
}
function readSettings() {
    const configuration = vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
    return {
        baseUrl: configuration.get("ollamaUrl", "http://localhost:11434"),
        model: configuration.get("model", "variable-translator"),
        style: configuration.get("style", "snake")
    };
}
function createEditorApi(editor) {
    return {
        askForText: () => vscode.window.showInputBox({
            title: "Перевод в имя переменной",
            prompt: "Введите русское предложение",
            placeHolder: "Количество активных пользователей",
            ignoreFocusOut: true
        }),
        getCursor: () => ({
            line: editor.selection.active.line,
            character: editor.selection.active.character
        }),
        insertAtCursor: (text, position) => editor.edit((edit) => edit.insert(new vscode.Position(position.line, position.character), text)),
        showError: (message) => {
            void vscode.window.showErrorMessage(message);
        }
    };
}
function createPreflightUi() {
    return {
        runCheck: (task) => withCancellableProgress("Проверка Ollama…", task),
        runStart: (task) => withCancellableProgress("Ollama запускается…", task),
        async chooseAction(status) {
            const actions = [];
            if (status.canStartLocal &&
                (status.state === "stopped" || status.errorCode === "network-error")) {
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
        showRunning() {
            void vscode.window.showInformationMessage("Ollama запущена и готова к работе.");
        },
        showError(errorCode) {
            void vscode.window.showErrorMessage(mapErrorMessage(errorCode));
        }
    };
}
async function withCancellableProgress(title, task) {
    return await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title,
        cancellable: true
    }, async (_progress, token) => {
        const controller = new AbortController();
        const subscription = token.onCancellationRequested(() => controller.abort());
        try {
            return await task(controller.signal);
        }
        finally {
            subscription.dispose();
        }
    });
}
function mapErrorMessage(code) {
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
