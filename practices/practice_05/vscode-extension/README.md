# Russian Variable Translator for VS Code

Расширение при каждом запуске сначала предлагает выбрать стиль имени переменной
(snake/camel/pascal/constant), затем запрашивает русское предложение, переводит
его с помощью локальной Ollama и вставляет английское имя переменной в активный
курсор редактора.

## Подготовка

1. Установите и запустите Ollama в отдельном терминале: `ollama serve`.
2. В папке `vscode-extension` установите зависимости: `npm ci`.
3. Соберите расширение: `npm run compile`.
5. Откройте папку `vscode-extension` в VS Code и нажмите `F5` — откроется окно
   Extension Development Host с загруженным расширением.

Если после ввода текста появляется `fetch failed`, значит расширение не может
подключиться к Ollama. Убедитесь, что `ollama serve` продолжает работать в
отдельном терминале. Если Ollama сообщает, что модель не найдена, повторите
`npm run ollama:setup`. Эту же команду нужно выполнить, если старая модель
возвращает служебный ответ `patch failed` вместо перевода.

## Использование

В активном редакторе нажмите:

- Windows/Linux: `Ctrl+Alt+T`;
- macOS: `Cmd+Option+T`.

Сначала выберите стиль (по умолчанию предвыбран стиль из настроек), затем
введите, например, `количество активных пользователей`. В курсор будет вставлено
имя в выбранном стиле (например, для snake — `number_of_active_users`).

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
