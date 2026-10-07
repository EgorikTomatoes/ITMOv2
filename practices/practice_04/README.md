# Переводчик имён переменных

Консольная программа принимает русское предложение, переводит его смысл на английский
и возвращает корректное имя переменной. Перевод выполняется локально через Ollama.

## Требования

- Python 3.9 или новее;
- [Ollama](https://ollama.com/).

## Запуск

Из папки `practices/practice_04` выполните:

```bash
ollama serve
make setup
python3 -m variable_translator "количество активных пользователей"
```

Результат:

```text
number_of_active_users
```

Без аргумента программа запросит фразу интерактивно:

```bash
make run
```

Доступные стили:

```bash
python3 -m variable_translator -s snake "имя текущего пользователя"
python3 -m variable_translator -s camel "имя текущего пользователя"
python3 -m variable_translator -s pascal "имя текущего пользователя"
python3 -m variable_translator -s constant "имя текущего пользователя"
```

Можно выбрать другую модель или адрес Ollama:

```bash
python3 -m variable_translator --model qwen2.5:3b --url http://localhost:11434 "текст"
```

## Тесты

Тесты не требуют запущенной Ollama:

```bash
make test
```

## Pre-commit

Ручная общая проверка:

```bash
make check
```

Она запускает Ruff для Python, ESLint для TypeScript, оба набора тестов и сборку
расширения. Установите Python-инструменты разработки один раз:

```bash
python3 -m pip install -e ".[dev]"
```

Git pre-commit — единственный триггер автоматизации: он выполняет `make check`
перед каждым коммитом файлов `practice_04`. В терминале хука выводятся событие,
команда, exit code и итог. Однократная настройка из корня репозитория:

```bash
python3 -m pip install pre-commit
pre-commit install
```

Ручной запуск всех проверок:

```bash
pre-commit run --files practices/practice_04/variable_translator/translator.py
```

## Окружение агента для домашней работы

Запускайте OpenCode из этой папки. `AGENTS.md` ограничивает область изменений,
требует TDD для новых возможностей и обязательный `make check` после правок.
Локальный skill `.agents/skills/tdd/SKILL.md` нужен, чтобы тестировать публичное
поведение короткими циклами RED → GREEN, а не закреплять тестами детали
реализации. Pre-commit hook и `scripts/pre-commit-check.sh` возвращают агенту
единый результат Python- и TypeScript-проверок до коммита.

`opencode.json` подключает собственный MCP-сервер `identifier-inspector`. У него
один узкий tool `inspect_identifier`: он проверяет, соответствует ли предложенное
английское имя выбранному стилю, и показывает нормализованный вариант. Узкий
tool выбран намеренно: он полезен для этого проекта и почти не расходует контекст
агента.

Проверить подключение и сделать два реальных stdio-вызова можно так:

```bash
opencode mcp list
make mcp-demo
```

В успешном сценарии `number_of_active_users` получает `valid: true`. В ошибочном
сценарии `42 пользователя` возвращается как MCP tool error с `isError: true` и
понятным требованием использовать ASCII.

Агентское применение выполнено локально без передачи файлов внешнему провайдеру:
Codex прочитал `AGENTS.md`, загрузил `SKILL.md` вместе с `tests.md` и
`mocking.md`, проверил публичный seam `tools/call`, вызвал собственный MCP tool и
после правок запустил pre-commit hook и `make check`. Полный журнал с командами,
ожидаемыми результатами и ссылками на машинные транскрипты находится в
`evidence/agent-application.md`.

Короткие подтверждения выполненных локальных запусков находятся в `evidence/`,
разбор skill — в `skill-analysis.md`, наблюдения — в `reflection.md`.
