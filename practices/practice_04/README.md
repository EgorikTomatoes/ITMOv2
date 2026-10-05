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
