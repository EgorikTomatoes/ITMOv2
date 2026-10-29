# Quickstart: Ollama precheck and local start

## Automated verification

From `vscode-extension` run:

```bash
npm ci
npm run check
```

Expected result: lint passes, all tests pass, and the production TypeScript build completes.

## Run in Extension Development Host

1. Open `vscode-extension` as the VS Code workspace.
2. Press `F5` and select `Run Russian Variable Translator` if prompted.
3. In the Extension Development Host, open any editable text file.
4. Stop Ollama if it is running.
5. Run `Перевести текст в имя переменной` from the Command Palette or press `Cmd+Option+T`.
6. Confirm that the first step reports the Ollama check and offers `Запустить Ollama`.
7. Select `Запустить Ollama` and wait for the ready notification.
8. Select an identifier style and enter `количество активных пользователей`.
9. Confirm that the translated identifier is inserted at the cursor.

## Expected examples

| Style | Result |
| --- | --- |
| snake | `active_users_count` |
| camel | `activeUsersCount` |
| pascal | `ActiveUsersCount` |
| constant | `ACTIVE_USERS_COUNT` |

## Failure and boundary checks

- Choose `Отмена` while Ollama is stopped: no text is requested or inserted.
- Temporarily set an invalid local URL: the extension shows an error and offers retry/cancel.
- Cancel the progress notification: the pending check/start is aborted and translation does not run.
- If Ollama cannot become ready before the deadline, the extension stops only the process that it started.

## Installable build

The verified build is `vscode-extension/russian-variable-translator-0.2.0.vsix`.
Install it through VS Code's `Extensions: Install from VSIX...` command. Reload VS Code after replacing an already loaded version.
