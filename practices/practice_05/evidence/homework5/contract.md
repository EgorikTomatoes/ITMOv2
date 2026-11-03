# UI ↔ Logic Contract: Ollama Precheck and Startup

Accepted decision (authoritative): states, operations, rules below. Logic reads configured ollamaUrl from extension settings; UI does not start system processes directly.

## Data Types

- State:
  - running — Ollama отвечает на health-check
  - stopped — соединение не установлено, пользователь может запросить запуск
  - starting — команда запуска выполнена, идёт ограниченное ожидание готовности
  - error — проверка или запуск завершились ошибкой

- ErrorCode (logic-level, for diagnostics and programmatic handling):
  - health-timeout — истёк тайм-аут проверки доступности
  - http-error — HTTP ≥ 400 на health-check (детали статуса доступны логике)
  - network-error — иные сетевые ошибки (ECONNREFUSED/ENOTFOUND/и т.п.)
  - user-cancelled — пользователь отменил операцию
  - unsupported-platform — автозапуск не поддерживается (не macOS)
  - ollama-not-found — команда ollama отсутствует в PATH
  - port-busy — порт ollamaUrl занят
  - start-timeout — не дождались готовности после запуска
  - start-failed — запуск завершился ошибкой (ненулевой код/фатальная ошибка)

- OllamaStatus (result shape returned to UI):
  - state: 'running' | 'stopped' | 'starting' | 'error'
  - message?: string — безопасное человекочитаемое сообщение (особенно для error)
  - errorCode?: ErrorCode — присутствует при state='error'
  - canStartLocal?: boolean — можно ли пытаться локальный запуск (true только для macOS + localhost URL + ollama в PATH)

- StartResult:
  - ok: boolean — удалось ли инициировать локальный запуск
  - message?: string — безопасное человекочитаемое сообщение при ok=false
  - errorCode?: ErrorCode — при ok=false

## Operation Signatures (logic layer)

- checkOllamaStatus(options?): Promise<OllamaStatus>
  - options?: { timeoutMs?: number; signal?: AbortSignal }
  - Поведение: health-check с тайм-аутом; возвращает running | stopped | error. Включает canStartLocal.

- startOllama(options?): Promise<StartResult>
  - options?: { signal?: AbortSignal }
  - Поведение: безопасно инициирует локальный запуск (без shell-конкатенации); возвращает ok=true при успешном старте процесса. Валидации: macOS, localhost URL, наличие ollama в PATH. При нарушении — ok=false с соответствующим errorCode.

- waitUntilOllamaReady(options?): Promise<OllamaStatus>
  - options?: { startDeadlineMs?: number; pollIntervalMs?: number; maxAttempts?: number; signal?: AbortSignal }
  - Поведение: опрос до готовности или истечения дедлайна; возвращает running либо error (start-timeout/user-cancelled/start-failed/другое).

Notes:
- UI не передаёт URL — логика использует текущие настройки расширения.
- Все длительные операции принимают AbortSignal и обязаны корректно завершаться при отмене.

## State Transition Table

| From      | Trigger/Condition                                     | To        | Output/Notes                                                                                       |
|-----------|--------------------------------------------------------|-----------|-----------------------------------------------------------------------------------------------------|
| (none)    | UI calls checkOllamaStatus                            | running   | Health-check ok                                                                                     |
| (none)    | UI calls checkOllamaStatus                            | stopped   | Соединение не установлено; include canStartLocal                                                     |
| (none)    | UI calls checkOllamaStatus                            | error     | errorCode: http-error | network-error | health-timeout | user-cancelled; message safe                                    |
| stopped   | UI chooses Start; startOllama ok                      | starting  | UI показывает прогресс; затем UI вызывает waitUntilOllamaReady                                      |
| stopped   | UI chooses Retry; checkOllamaStatus                   | running   | На успех — перейти к переводу                                                                        |
| stopped   | UI chooses Retry; checkOllamaStatus                   | stopped   | Повторить цикл                                                                                      |
| stopped   | UI chooses Retry; checkOllamaStatus                   | error     | Показать ошибку                                                                                      |
| starting  | waitUntilOllamaReady confirms running within deadline | running   | Продолжить существующий перевод                                                                      |
| starting  | waitUntilOllamaReady times out/fails/cancelled        | error     | errorCode: start-timeout | start-failed | user-cancelled; логика безопасно завершает только свой процесс |
| error     | UI chooses Retry; checkOllamaStatus                   | running   | На успех — перейти к переводу                                                                        |
| error     | UI chooses Retry; checkOllamaStatus                   | stopped   | Предложить запуск                                                                                    |
| error     | UI chooses Start (if canStartLocal)                   | starting  | См. выше                                                                                            |
| any       | UI chooses Cancel / signal aborts                     | error     | errorCode: user-cancelled; документ не меняется                                                     |

## Error Table (logic→UI mapping)

| ErrorCode         | Typical Condition                          | Safe Message (example)                | Retry | Start Allowed |
|-------------------|--------------------------------------------|---------------------------------------|-------|---------------|
| health-timeout    | Истёк тайм-аут health-check                | «Проверка Ollama заняла слишком долго» | Yes   | If canStart   |
| http-error        | HTTP ≥ 400 от API                          | «Ollama недоступна»                    | Yes   | If canStart   |
| network-error     | Сетевые ошибки/соединение отсутствует      | «Не удалось подключиться к Ollama»     | Yes   | If canStart   |
| user-cancelled    | Пользователь отменил                       | «Действие отменено»                    | Yes   | If canStart   |
| unsupported-platform | Не macOS                                 | «Автозапуск не поддерживается»         | Yes   | No            |
| ollama-not-found  | Нет команды в PATH                         | «Команда ollama не найдена»            | Yes   | No            |
| port-busy         | Порт занят                                 | «Порт Ollama занят»                    | Yes   | Yes (after fix) |
| start-timeout     | Готовность не подтверждена в дедлайн       | «Ollama не запустилась вовремя»        | Yes   | Yes           |
| start-failed      | Ошибка запуска процесса                     | «Не удалось запустить Ollama»          | Yes   | Yes           |

UI отображает свои локализованные тексты; приведённые — безопасные примеры, допустимые к показу. Логика предоставляет errorCode и безопасный message.

## Responsibilities

- UI:
  - Вызывает: checkOllamaStatus → (при stopped/error и canStartLocal) startOllama → waitUntilOllamaReady
  - Отображает состояния: Loading (пока выполняется check/start/wait), Running, Stopped, Starting, Error
  - Предлагает действия: «Запустить», «Повторить», «Отмена» согласно canStartLocal и текущему состоянию
  - Передаёт отмену через AbortSignal
  - При state='running' переходит к текущему сценарию: выбор стиля → ввод текста → вставка результата
  - При ошибке/отмене — не изменяет документ

- Logic:
  - Исполняет health-check с тайм-аутом (по умолчанию ≤ 1500 мс)
  - Безопасно запускает локальную Ollama только по явному вызову, без shell-конкатенации пользовательских данных; ограничение: macOS + localhost + команда в PATH
  - После старта ожидает готовности с дедлайном (по умолчанию ≤ 15000 мс) и опросом (~500 мс)
  - При отмене/ошибке — не выполняет перевод, не меняет документ; если процесс был запущен логикой и готовность не подтверждена, безопасно завершает только этот процесс
  - Возвращает стабильные состояния, errorCode, безопасные message; предоставляет признак canStartLocal
  - Обеспечивает тестируемость через DI: поддельные fetch/процессы/таймеры; unit-тесты не требуют установленной Ollama

## Timing and Defaults (enforced by logic)

- Health-check timeout ≤ 1.5s (override опционально)
- Poll interval ≈ 500ms
- Start readiness deadline ≤ 15s (или maxAttempts ≈ 30)
- Эти параметры опционально настраиваемы через options, UI может их не указывать

## Compliance with Accepted Rules

1) Проверка выполняется перед выбором стиля — UI вызывает checkOllamaStatus сначала
2) running продолжает существующий сценарий — UI переходит к переводу
3) stopped — UI предлагает «Запустить», «Повторить», «Отмена» (запуск — только если canStartLocal)
4) starting — UI показывает прогресс, пока работает waitUntilOllamaReady
5) error — логика даёт безопасный message и errorCode; UI предлагает «Повторить»/«Отмена»
6) При отмене/ошибке — перевода нет, документ не меняется
7) Запуск — только по явному выбору пользователя (UI вызывает startOllama)
8) Ожидание запуска — ограничено тайм-аутом (startDeadlineMs/maxAttempts)
9) Unit-тесты — через DI без реальной Ollama
10) Реальный автозапуск — только macOS + ollama в PATH
11) Текущий перевод — без изменений после state='running'
