# Отчёт: контролируемая проверка линтера

## Цель

Подтвердить, что ручная проверка `make lint` обнаруживает ошибку в Python-коде,
а после точечного исправления возвращает успешный статус.

## Временная поломка

В файл `variable_translator/__init__.py` был намеренно добавлен неиспользуемый
импорт:

```diff
 """Translate Russian phrases into English code identifiers."""

+import os
+
 from .translator import TranslationError, VariableTranslator
```

Это нарушение правила Ruff `F401` — импорт существует, но нигде не используется.

## Проверка до исправления

Команда:

```bash
make lint
```

Результат: **exit code 2**.

Фрагмент журнала:

```text
F401 `os` imported but unused
 --> variable_translator/__init__.py:3:8
help: Remove unused import: `os`
Found 1 error.
make: *** [lint] Error 1
```

Линтер остановил проверку на этапе `ruff check`; проверка форматирования не
запускалась, поскольку `make` завершает цепочку после первой неуспешной команды.

## Исправление

Временный импорт `import os` был удалён. Другие строки исходного кода не
изменялись.

```diff
 """Translate Russian phrases into English code identifiers."""
 
-import os
-
 from .translator import TranslationError, VariableTranslator
```

## Проверка после исправления

Команда:

```bash
make lint
```

Результат: **exit code 0**.

Фрагмент журнала:

```text
python3 -m ruff check variable_translator tests
All checks passed!
python3 -m ruff format --check variable_translator tests
5 files already formatted
```

## Сравнение

| Критерий | До исправления | После исправления |
| --- | --- | --- |
| Изменение | Неиспользуемый `import os` | Импорт удалён |
| Проверка Ruff | Ошибка `F401` в строке 3 | Ошибок нет |
| Форматирование | Не запущено из-за ошибки lint | 5 файлов соответствуют формату |
| Exit code `make lint` | `2` | `0` |
| Итог | Проверка заблокирована | Проверка пройдена |

## Вывод

Ручная команда `make lint`, которую использует Git pre-commit, корректно
блокирует код с неиспользуемым импортом. После удаления дефекта исходный код
возвращён в рабочее состояние, а линтер и форматирование проходят успешно.
