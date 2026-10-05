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
const COMMAND_ID = "variableTranslator.translateAtCursor";
const CONFIGURATION_SECTION = "russianVariableTranslator";
function activate(context) {
    const disposable = vscode.commands.registerCommand(COMMAND_ID, async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            void vscode.window.showErrorMessage("Откройте файл в редакторе, чтобы вставить имя переменной.");
            return;
        }
        const editorApi = createEditorApi(editor);
        const translator = (0, ollama_1.createOllamaTranslator)(globalThis.fetch, readSettings());
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
