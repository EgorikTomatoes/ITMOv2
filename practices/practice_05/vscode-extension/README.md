# Russian Variable Translator for VS Code

Расширение запрашивает русское предложение, переводит его с помощью локальной
Ollama и вставляет английское имя переменной в активный курсор редактора.

## Подготовка

1. Запустите Ollama: `ollama serve`.
2. В корне `practice_04` создайте модель: `make setup`.
3. В этой папке выполните `npm install` и `npm run compile`.
4. Откройте папку `vscode-extension` в VS Code и нажмите `F5` — откроется окно
   Extension Development Host с загруженным расширением.

## Использование

В активном редакторе нажмите:

- Windows/Linux: `Ctrl+Alt+T`;
- macOS: `Cmd+Option+T`.

Введите, например, `количество активных пользователей`. При стиле по умолчанию
в курсор будет вставлено `number_of_active_users`.

Команду также можно вызвать через Command Palette: `Перевести текст в имя переменной`.

## Настройки

| Настройка | По умолчанию | Назначение |
| --- | --- | --- |
| `russianVariableTranslator.ollamaUrl` | `http://localhost:11434` | Адрес Ollama API |
| `russianVariableTranslator.model` | `variable-translator` | Локальная модель Ollama |
| `russianVariableTranslator.style` | `snake` | `snake`, `camel`, `pascal` или `constant` |

## Проверка

```bash
npm test
npm run compile
```
