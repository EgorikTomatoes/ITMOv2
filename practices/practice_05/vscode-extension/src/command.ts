export interface CursorPosition {
  line: number;
  character: number;
}

export interface EditorApi {
  askForText(): PromiseLike<string | undefined>;
  getCursor(): CursorPosition;
  insertAtCursor(text: string, position: CursorPosition): PromiseLike<boolean>;
  showError(message: string): void;
}

export type Translator = (text: string) => Promise<string>;

export async function runTranslationCommand(
  editor: EditorApi,
  translate: Translator
): Promise<void> {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    editor.showError(`Не удалось перевести текст: ${message}`);
  }
}
