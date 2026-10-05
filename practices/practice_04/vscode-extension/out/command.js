"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runTranslationCommand = runTranslationCommand;
async function runTranslationCommand(editor, translate) {
    const sourceText = await editor.askForText();
    if (!sourceText?.trim()) {
        return;
    }
    try {
        const translated = await translate(sourceText);
        const inserted = await editor.insertAtCursor(translated, editor.getCursor());
        if (!inserted) {
            editor.showError("Не удалось вставить имя переменной в редактор.");
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        editor.showError(`Не удалось перевести текст: ${message}`);
    }
}
