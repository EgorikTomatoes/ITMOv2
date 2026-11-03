# Snapshot: Logic Spec (before inter-team alignment)

Source: specs/002-ollama-precheck-logic/spec.md

[The content below is an exact copy at snapshot time]

# Feature Specification: ollama-precheck-logic

**Feature Branch**: `[###-feature-name]`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Фича: проверка доступности и запуск Ollama перед выполнением перевода в VS Code extension Russian Variable Translator. Ты представляешь только команду системной логики. Не читай UI-спецификацию первой команды до завершения своей первоначальной версии. Код не меняй. Изучи текущие: - vscode-extension/src/ollama.ts; - vscode-extension/src/command.ts; - vscode-extension/src/extension.ts; - vscode-extension/test/command.test.ts; - vscode-extension/package.json. Подготовь спецификацию логики, которая описывает: 1. Проверку доступности Ollama по настроенному ollamaUrl. 2. Ограниченный тайм-аут проверки, чтобы команда не зависала. 3. Состояния running, stopped, starting и error. 4. Запуск Ollama только после явного решения пользователя. 5. Запуск локальной команды Ollama без shell-конкатенации пользовательских данных. 6. Повторную проверку после запуска с ограниченным числом попыток или общим тайм-аутом. 7. Корректную обработку отсутствующего executable ollama. 8. Корректную обработку занятого порта, тайм-аута и неуспешного запуска. 9. Отсутствие перевода и изменения документа при отмене или ошибке. 10. Сохранение текущего поведения перевода после успешной проверки. 11. Возможность тестирования через внедрение зависимостей: fetch, запуск процесса и ожидание не должны требовать настоящую Ollama в unit-тестах. Не определяй конкретные окна и тексты кнопок — это зона UI-команды. Для ДЗ допустимо ограничить реальный запуск системой macOS и установленной командой ollama в PATH. Ограничение должно быть явно записано. Проверка доступности по настроенному URL остаётся независимой от платформы."

## Clarifications

### Session 2026-10-28

- Q: What should the logic do with the locally started Ollama process after the command, in both success and failure/timeout cases? → A: If readiness is confirmed, leave it running; if not confirmed due to failure/timeout/cancel, terminate only the process started by this command.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Перевод при запущенной Ollama (Priority: P1)

Пользователь запускает команду перевода. Система проверяет доступность Ollama по настроенному ollamaUrl за ограниченное время. Если Ollama доступна (running), перевод выполняется как сейчас, без дополнительных действий пользователя.

**Why this priority**: Это основной сценарий, должен работать быстро и надёжно без изменения текущего UX перевода.

**Independent Test**: Смоделировать успешный health-check (мок fetch) и убедиться, что после проверки вызывается ровно та же логика перевода, что и сегодня, и никакие дополнительные запросы к редактору не выполняются.

**Acceptance Scenarios**:

1. Given Ollama отвечает по ollamaUrl в пределах тайм-аута проверки, When пользователь запускает команду перевода, Then перевод выполняется и имя переменной вставляется в редактор.
2. Given Ollama отвечает кодом ошибки HTTP (например, 500), When выполняется проверка, Then состояние — error и перевод не выполняется, пользователю показывается ошибка.

---

### User Story 2 - Предложение запустить локальную Ollama (Priority: P2)

Пользователь запускает команду перевода, но Ollama недоступна (stopped). Система предлагает (через UI-слой) явно подтвердить запуск локальной Ollama, затем пытается запустить её и дождаться готовности в рамках ограничений.

**Why this priority**: Позволяет пользователю восстановить рабочее состояние без выхода из IDE.

**Independent Test**: Смоделировать недоступность (мок fetch с timeout/ECONNREFUSED), затем смоделировать согласие пользователя на запуск и успешный старт (моки процесс-раннера и повторной проверки). Убедиться, что после старта перевод выполняется как обычно.

**Acceptance Scenarios**:

1. Given проверка вернула stopped и пользователь согласился на запуск, When старт выполнен и повторная проверка в пределах общего тайм-аута зафиксировала running, Then перевод выполняется и документ изменяется только при успешной вставке.
2. Given пользователь отклонил запуск, When команда завершена, Then перевод не выполняется и документ не изменяется.

---

### User Story 3 - Корректная обработка сбоев запуска (Priority: P2)

Если запуск не удался (нет executable, занят порт, неуспешный старт, истёк тайм-аут), команда завершается с понятным состоянием error и без изменений документа.

**Why this priority**: Отказоустойчивость и прозрачность ошибок важны для UX и поддержки.

**Independent Test**: Смоделировать каждый тип ошибки через моки (ENOENT, EADDRINUSE, неуспешный код завершения, тайм-аут ожидания). Проверить, что перевод не выполняется и возвращаются корректные коды ошибок.

**Acceptance Scenarios**:

1. Given отсутствует исполняемый файл ollama, When пользователь согласился на запуск, Then старт не выполняется, состояние — error: "ollama-not-found", перевода нет.
2. Given порт из ollamaUrl занят другим процессом, When выполнена попытка запуска, Then состояние — error: "port-busy", перевода нет.
3. Given процесс запущен, но за отведённое время сервис не начал отвечать, When истёк общий тайм-аут, Then состояние — error: "start-timeout", перевода нет.

---

### Edge Cases

- Пользователь настроил удалённый ollamaUrl (не localhost). Проверка доступности выполняется, но автозапуск локального процесса не предлагается и не выполняется; при недоступности — error или остановка без запуска.
- Проверка доступности завершается по тайм-ауту; состояние — error: "health-timeout" и перевод не выполняется.
- Во время повторной проверки после запуска происходит кратковременная ошибка сети; система продолжает попытки до исчерпания числа попыток или общего дедлайна.
- Старт разрешён только на macOS; на другой платформе запуск не предпринимается, возвращается error: "unsupported-platform" при попытке старта.
- Нельзя запускать Ollama, если в конфигурации указан нестандартный порт/URL, но порт уже занят другим сервисом, который не является Ollama; повторная проверка не подтвердит running — будет start-timeout.

## Requirements *(mandatory)*

### Functional Requirements

- FR-001: Система ДОЛЖНА выполнять health-check Ollama по настройке ollamaUrl с ограниченным тайм-аутом (по умолчанию ≤ 1500 мс) без побочных эффектов на модель.
- FR-002: Health-check ДОЛЖЕН определять одно из состояний: running (успешный ответ), stopped (соединение отсутствует/ECONNREFUSED/ENOTFOUND), error (HTTP ≥ 400 или иная ошибка запроса/разбора), starting (используется только в ходе запуска).
- FR-003: При состоянии running перевод ДОЛЖЕН выполняться, сохраняя текущую логику и поведение вставки текста без изменений.
- FR-004: При состоянии stopped система НЕ ДОЛЖНА запускать Ollama без явного согласия пользователя. Логический слой ДОЛЖЕН поддерживать явную передачу решения пользователя (например, булево подтверждение) или колбэк подтверждения, предоставляемый UI.
- FR-005: При получении явного согласия пользователя система ДОЛЖНА попытаться запустить локальный процесс Ollama безопасным способом: фиксированная команда и аргументы без shell-конкатенации пользовательских данных.
- FR-006: Запуск ДОЛЖЕН быть ограничен платформой macOS и наличием исполняемого файла ollama в PATH. На других платформах запуск НЕ ДОЛЖЕН выполняться; должно возвращаться error: "unsupported-platform".
- FR-007: После запуска система ДОЛЖНА выполнять повторную проверку доступности с ограничением по числу попыток и/или общему тайм-ауту: например, до 30 попыток с интервалом ~500 мс и общим дедлайном ≤ 15 сек. Первое успешное подтверждение running завершает ожидание.
- FR-008: Если исполняемый файл ollama отсутствует (ошибка ENOENT), система ДОЛЖНА закончить с error: "ollama-not-found" без дополнительных попыток.
- FR-009: Если порт из ollamaUrl занят (EADDRINUSE или явные признаки в ошибке запуска), система ДОЛЖНА вернуть error: "port-busy" и прекратить запуск.
- FR-010: Если процесс стартовал, но по истечении общего дедлайна Ollama не отвечает успешно, система ДОЛЖНА вернуть error: "start-timeout".
- FR-011: Если запуск завершился неуспешно (ненулевой код завершения или фатальная ошибка процесса), система ДОЛЖНА вернуть error: "start-failed" с диагностическими деталями.
- FR-012: При любой ошибке или отмене пользователем перевод НЕ ДОЛЖЕН выполняться и документ НЕ ДОЛЖЕН изменяться.
- FR-013: Проверка доступности НЕ ДОЛЖНА зависать: при превышении тайм-аута health-check завершается с error: "health-timeout".
- FR-014: Логический слой ДОЛЖЕН позволять тестирование без реальной Ollama через внедрение зависимостей: fetch, запуск процесса и ожидание (sleep/таймеры/время) должны быть инъецируемыми.
- FR-015: Автозапуск НЕ ДОЛЖЕН выполняться для удалённого ollamaUrl (не localhost/127.0.0.1/[::1]). В этом случае при недоступности возвращается stopped/error и управление передаётся UI для информирования пользователя.
- FR-016: При успешной проверке/запуске дальнейшая логика перевода ДОЛЖНА оставаться идентичной текущей реализации.
- FR-017: Если локальный процесс Ollama был запущен данной командой и готовность подтверждена (running), он ДОЛЖЕН быть оставлен запущенным; если готовность не подтверждена (ошибка/тайм-аут/отмена), процесс, запущенный данной командой, ДОЛЖЕН быть безопасно завершён. Ранее запущенные процессы затрагиваться НЕ ДОЛЖНЫ.

### States and Transitions

- States:
  - running: сервис доступен по ollamaUrl (health-check успешен)
  - stopped: сервис недоступен по ollamaUrl (соединение отсутствует)
  - starting: выполняется попытка запуска локального процесса и повторная проверка
  - error: любая неисправимая ошибка, препятствующая переводу

- Transitions:
  - initial → running: health-check успешен в пределах тайм-аута
  - initial → stopped: health-check не установил соединение
  - initial → error: health-check завершился ошибкой (HTTP ≥ 400, health-timeout, и т.п.)
  - stopped → starting: пользователь явно согласился на запуск локальной Ollama (и платформа/окружение поддерживают запуск)
  - starting → running: повторная проверка подтвердила готовность в пределах дедлайна
  - starting → error: start-timeout | start-failed | port-busy | ollama-not-found | unsupported-platform
  - stopped → error: попытка старта невозможна (unsupported-platform) при явном согласии, или UI отклонил запрос

### Error Codes (logic layer)

- health-timeout: истечение тайм-аута health-check
- http-error: ответ HTTP ≥ 400 на health-check (с деталями статуса)
- network-error: иные сетевые ошибки health-check
- user-cancelled: пользователь отказался от запуска
- unsupported-platform: запуск недоступен на текущей платформе
- ollama-not-found: отсутствует исполняемый файл ollama в PATH
- port-busy: порт из ollamaUrl занят
- start-timeout: не дождались доступности после запуска
- start-failed: запуск завершился ошибкой (ненулевой код/фатальная ошибка)

### Interfaces (logic layer)

- Types
  - OllamaUrl: string
  - Status: "running" | "stopped" | "starting" | "error"
  - ErrorCode: перечисление из раздела Error Codes; включает optional details: string

- Dependencies (DI)
  - FetchLike: (input: string, init?: { method?: string; headers?: Record<string,string>; body?: string; signal?: AbortSignal }) => Promise<Response>
  - ProcessRunner: { exists(command: string): Promise<boolean>; start(command: string, args: string[], options?: { cwd?: string; env?: Record<string,string> }): Promise<StartedProcess> }
  - StartedProcess: { pid: number; exited: Promise<{ code: number | null; signal: string | null }>; stdout?: AsyncIterable<string>; stderr?: AsyncIterable<string>; stop?: () => Promise<void> }
  - Sleeper: { sleep(ms: number): Promise<void> }
  - Clock/Deadline: { now(): number } (необязательно; может использоваться для общего дедлайна)
  - Platform: { isMacOS: boolean }

- HealthCheck API
  - checkAvailability(ollamaUrl: OllamaUrl, deps: { fetch: FetchLike }, opts?: { timeoutMs?: number }): Promise<{ state: "running" | "stopped" | "error"; errorCode?: ErrorCode; httpStatus?: number }>
  - Транспорт: HTTP GET к лёгкому эндпоинту (например, `${ollamaUrl}/api/version`) с AbortSignal и тайм-аутом.

- Start API
  - canStartLocal(ollamaUrl: OllamaUrl, deps: { platform: Platform }): boolean — true только для localhost URL на macOS.
  - startLocalOllama(deps: { runner: ProcessRunner; platform: Platform }): Promise<{ ok: true; process: StartedProcess } | { ok: false; errorCode: ErrorCode; details?: string }>
    - Команда: "ollama" с фиксированными аргументами ["serve"]. Никаких пользовательских строк.
    - Перед startLocalOllama runner.exists("ollama") — если false, вернуть ollama-not-found.
    - Если процесс был запущен данной операцией и готовность впоследствии не будет подтверждена оркестратором, он ДОЛЖЕН быть безопасно остановлен (если это поддерживает StartedProcess).

- EnsureRunning Orchestrator
  - ensureOllamaRunning(ollamaUrl: OllamaUrl, deps: { fetch: FetchLike; runner: ProcessRunner; sleeper: Sleeper; platform: Platform }, policy: { confirmStart: () => Promise<boolean>; healthTimeoutMs?: number; pollIntervalMs?: number; startDeadlineMs?: number; maxAttempts?: number }):
    - Выполняет checkAvailability.
    - Если running — вернуть { state: "running" }.
    - Если error/stopped и canStartLocal(...) == false — вернуть { state: "error" | "stopped" , errorCode } без перевода.
    - Если stopped и пользователь подтвердил (confirmStart) — перевести в starting, вызвать startLocalOllama, затем выполнять повторные проверки до успеха или дедлайна. Возвращать итоговое состояние.
    - Если пользователь отказал — вернуть { state: "error", errorCode: "user-cancelled" }.
    - Если локальный процесс был запущен в рамках этой операции, но готовность не подтверждена (ошибка, тайм-аут, отмена), оркестратор ДОЛЖЕН инициировать его безопасное завершение и вернуть соответствующий errorCode.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- SC-001: При доступной Ollama дополнительная проверка завершается ≤ 1.5 секунды (по умолчанию) и не препятствует переводу.
- SC-002: При недоступной Ollama и согласии на запуск, система либо подтверждает доступность и запускает перевод ≤ 15 секунд, либо корректно завершает с ошибкой без изменений документа.
- SC-003: В 100% случаев ошибок/отмен перевод не выполняется и документ не изменяется.
- SC-004: Логику можно полностью покрыть юнит-тестами без реальной Ollama, реального сети и запуска процессов (100% сценариев в разделах выше тестируются через DI).
- SC-005: Безопасность вызова старта: ни один путь не использует shell-конкатенацию пользовательских данных; команда и аргументы фиксированы.

## Assumptions

- Health-check использует лёгкий информационный эндпоинт (например, /api/version) и HTTP GET.
- Значения по умолчанию: healthTimeoutMs ≈ 1500 мс; pollIntervalMs ≈ 500 мс; startDeadlineMs ≈ 15000 мс; maxAttempts ≈ 30.
- Автозапуск локальной Ollama доступен только на macOS и только при наличии команды "ollama" в PATH; это ограничение явно зафиксировано для ДЗ.
- Для удалённого ollamaUrl (не localhost) автозапуск не выполняется.
- UI-слой отвечает за тексты, кнопки, отображение ошибок; логический слой возвращает коды ошибок и состояния.
- После успешной проверки/запуска используется текущий Translator и редакторский поток без изменений.

### Key Entities *(include if feature involves data)*

- OllamaPreflightSession: инкапсулирует один запуск команды перевода, хранит параметры таймингов, зависимости и промежуточные состояния (running/stopped/starting/error).
- AvailabilityResult: { state, errorCode?, httpStatus? } — результат health-check.
- StartResult: { ok: boolean; process?; errorCode?; details? } — результат попытки запуска.
