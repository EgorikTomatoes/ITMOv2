# Snapshot: Logic Spec (after applying accepted contract)

Source: specs/002-ollama-precheck-logic/spec.md

[The content below is an exact copy at snapshot time]

# Feature Specification: ollama-precheck-logic

**Feature Branch**: `[###-feature-name]`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Фича: проверка доступности и запуск Ollama перед выполнением перевода в VS Code extension Russian Variable Translator. Ты представляешь только команду системной логики. Не читай UI-спецификацию первой команды до завершения своей первоначальной версии. Код не меняй. Изучи текущие: - vscode-extension/src/ollama.ts; - vscode-extension/src/command.ts; - vscode-extension/src/extension.ts; - vscode-extension/test/command.test.ts; - vscode-extension/package.json. Подготовь спецификацию логики, которая описывает: 1. Проверку доступности Ollama по настроенному ollamaUrl. 2. Ограниченный тайм-аут проверки, чтобы команда не зависала. 3. Состояния running, stopped, starting и error. 4. Запуск Ollama только после явного решения пользователя. 5. Запуск локальной команды Ollama без shell-конкатенации пользовательских данных. 6. Повторную проверку после запуска с ограниченным числом попыток или общим тайм-аутом. 7. Корректную обработку отсутствующего executable ollama. 8. Коректную обработку занятого порта, тайм-аута и неуспешного запуска. 9. Отсутствие перевода и изменения документа при отмене или ошибке. 10. Сохранение текущего поведения перевода после успешной проверки. 11. Возможность тестирования через внедрение зависимостей: fetch, запуск процесса и ожидание не должны требовать настоящую Ollama в unit-тестах. Не определяй конкретные окна и тексты кнопок — это зона UI-команды. Для ДЗ допустимо ограничить реальный запуск системой macOS и установленной командой ollama в PATH. Ограничение должно быть явно записано. Проверка доступности по настроенному URL остаётся независимой от платформы."

This spec is aligned with the accepted contract: see evidence/homework5/contract.md (Data Types; Operation Signatures; State Transition Table; Error Table; Responsibilities; Timing and Defaults).

## Clarifications

### Session 2026-10-28

- Q: What should the logic do with the locally started Ollama process after the command, in both success and failure/timeout cases? → A: If readiness is confirmed, leave it running; if not confirmed due to failure/timeout/cancel, terminate only the process started by this command. (See contract: Responsibilities)

## User Scenarios & Testing (mandatory)

This section aligns with the contract (State Transition Table; Operation Signatures; Error Table; Timing and Defaults). Tests assume DI (mock fetch/process/timers) and use AbortSignal to simulate cancellation.

### User Story 1 - Предпроверка и продолжение перевода (Priority: P1)

Проверка доступности перед переводом и продолжение существующего сценария при state='running'.

**Independent Test**: Вызвать checkOllamaStatus() с мок-фетчем; получить { state: 'running' } за ≤ 1.5s (контракт: Timing and Defaults). Подтвердить, что после этого вызывается текущая логика перевода без изменений (контракт: Rules 2, 11).

**Acceptance Scenarios**:

1. Given checkOllamaStatus() вызван, When ответ успешен в пределах тайм-аута, Then вернуть OllamaStatus { state: 'running' } и перейти к переводу (контракт: Rules 1–2).
2. Given HTTP ≥ 400 на health-check, When checkOllamaStatus(), Then вернуть { state: 'error', errorCode: 'http-error', message } и не вызывать перевод (контракт: Error Table; Rules 5–6).

---

### User Story 2 - Недоступность и запуск по запросу (Priority: P2)

При недоступности (stopped) запуск выполняется только по явному решению пользователя, затем ожидание готовности с дедлайном.

**Independent Test**: Смоделировать ECONNREFUSED/timeout → checkOllamaStatus() → { state: 'stopped', canStartLocal }. Если canStartLocal=true, вызвать startOllama() → { ok: true }, затем waitUntilOllamaReady() → { state: 'running' } ≤ 15s (контракт: Operation Signatures; Timing and Defaults). После 'running' — перевод без изменений (Rules 2, 11).

**Acceptance Scenarios**:

1. Given checkOllamaStatus() → { state: 'stopped', canStartLocal: true }, When startOllama() и затем waitUntilOllamaReady() подтверждает { state: 'running' } ≤ 15s, Then инициировать существующий перевод (контракт: State Transition Table; Rules 2, 8, 11).
2. Given пользователь отменяет, When AbortSignal прерывает startOllama() или waitUntilOllamaReady(), Then вернуть errorCode: 'user-cancelled' и перевод не вызывается (Error Table; Rules 6).

---

### User Story 3 - Сбоевые сценарии старта (Priority: P2)

Ошибки автозапуска корректно классифицируются и не приводят к изменению документа.

**Independent Test**: ENOENT → startOllama() возвращает { ok: false, errorCode: 'ollama-not-found', message }. Порт занят/готовность не подтверждена до дедлайна → waitUntilOllamaReady() → { state: 'error', errorCode: 'port-busy' | 'start-timeout' }. Ненулевой код процесса → { state: 'error', errorCode: 'start-failed' }. Во всех случаях перевод не вызывается (контракт: Error Table; Rules 6, 8).

**Acceptance Scenarios**:

1. Given нет команды в PATH, When startOllama(), Then { ok: false, errorCode: 'ollama-not-found', message } и перевод не вызывается (Error Table; Rules 6, 7).
2. Given порт из ollamaUrl занят, When waitUntilOllamaReady() истекает по дедлайну, Then { state: 'error', errorCode: 'start-timeout' | 'port-busy' } и перевод не вызывается (Error Table; Rules 6, 8).
3. Given процесс завершился ошибкой, When waitUntilOllamaReady(), Then { state: 'error', errorCode: 'start-failed' } и перевод не вызывается (Error Table).

---

### Edge Cases

- Удалённый ollamaUrl (не localhost): checkOllamaStatus() возвращает canStartLocal=false; автозапуск не предлагается (контракт: Data Types; Responsibilities).
- Тайм-аут проверки: { state: 'error', errorCode: 'health-timeout' }; перевод не вызывается (Error Table).
- Сбой в процессе ожидания, после запуска: until-ready продолжает опрос до исчерпания дедлайна (контракт: Timing and Defaults), затем { state: 'error', errorCode: 'start-timeout' }.
- Платформа не macOS: startOllama() → { ok: false, errorCode: 'unsupported-platform' } (Error Table).
- Безопасное завершение: если процесс был запущен логикой и готовность не подтверждена, он безопасно завершается (Clarifications; Responsibilities).

## Requirements (mandatory)

### Functional Requirements

Все требования согласованы с контрактом (см. evidence/homework5/contract.md: Data Types; Operation Signatures; State Transition Table; Error Table; Timing and Defaults).

- FR-001: Логика ДОЛЖНА выполнять health-check через checkOllamaStatus с тайм-аутом по умолчанию ≤ 1.5s и без побочных эффектов (контракт: Operation Signatures; Timing and Defaults).
- FR-002: checkOllamaStatus ДОЛЖЕН возвращать state ∈ {'running','stopped','error'}, а также canStartLocal и безопасный message при ошибке (контракт: Data Types).
- FR-003: При state='running' перевод ДОЛЖЕН выполняться по текущей логике без изменений (контракт: Rules 2, 11).
- FR-004: При state='stopped' автозапуск НЕ ДОЛЖЕН выполняться без явного выбора пользователя; UI вызывает startOllama (контракт: Rules 3, 7).
- FR-005: startOllama ДОЛЖНА инициировать локальный запуск безопасно, фиксированными аргументами без shell-конкатенации (контракт: Responsibilities Logic).
- FR-006: Автозапуск ДОЛЖЕН быть ограничен macOS и наличием команды в PATH; иначе startOllama возвращает errorCode: 'unsupported-platform' | 'ollama-not-found' (контракт: Error Table).
- FR-007: waitUntilOllamaReady ДОЛЖНА опрашивать статус с интервалом ~500ms до 'running' или дедлайна ≤ 15s/макс. попыток (контракт: Operation Signatures; Timing and Defaults).
- FR-008: При ENOENT startOllama ДОЛЖНА вернуть { ok: false, errorCode: 'ollama-not-found' } без повторов (контракт: Error Table).
- FR-009: Если порт занят, waitUntilOllamaReady ДОЛЖНА вернуть { state: 'error', errorCode: 'port-busy' | 'start-timeout' } (контракт: Error Table).
- FR-010: При превышении дедлайна готовности waitUntilOllamaReady ДОЛЖНА вернуть { state: 'error', errorCode: 'start-timeout' } (контракт: Error Table).
- FR-011: При фатальной ошибке/ненулевом коде процесса ожидание ДОЛЖНО завершаться { state: 'error', errorCode: 'start-failed' } (контракт: Error Table).
- FR-012: При любой ошибке/отмене (errorCode: 'user-cancelled') перевод НЕ должен вызываться; документ НЕ меняется (контракт: Rules 5–6).
- FR-013: При истечении тайм-аута проверки checkOllamaStatus ДОЛЖЕН вернуть { state: 'error', errorCode: 'health-timeout' } (контракт: Error Table).
- FR-014: Логика ДОЛЖНА поддерживать DI (fetch/process/timers) и принимать AbortSignal для прерывания длительных операций (контракт: Responsibilities Logic).
- FR-015: Для удалённого ollamaUrl checkOllamaStatus ДОЛЖЕН возвращать canStartLocal=false (контракт: Data Types; Responsibilities).
- FR-016: После { state: 'running' } дальнейшая логика перевода ДОЛЖНА оставаться прежней (контракт: Rules 2, 11).
- FR-017: Если локальный процесс был запущен логикой и готовность не подтверждена (ошибка/тайм-аут/отмена), он ДОЛЖЕН быть безопасно завершён; если подтверждена — оставлен запущенным (Clarifications; Responsibilities Logic).

### States and Transitions

Состояния логики соответствуют контракту (State Transition Table):

- running: сервис доступен по ollamaUrl (health-check успешен)
- stopped: сервис недоступен по ollamaUrl (соединение отсутствует)
- starting: запуск инициирован и выполняется ожидание готовности
- error: ошибка проверки или запуска

Ключевые переходы:

- initial → running: checkOllamaStatus() успешен ≤ 1.5s (контракт: Timing and Defaults)
- initial → stopped|error: checkOllamaStatus() фиксирует недоступность/ошибку
- stopped → starting: startOllama() ok=true (контракт: State Transition Table)
- starting → running: waitUntilOllamaReady() подтверждает готовность ≤ 15s
- starting → error: waitUntilOllamaReady() → 'start-timeout' | 'start-failed' | 'port-busy' | 'user-cancelled'

### Error Codes (logic layer)

См. контракт: Error Table. Логика возвращает errorCode и безопасный message; UI самостоятельно маппит на локализованные тексты.

### Interfaces (logic layer)

Выдержка из контракта (Operation Signatures; Data Types):

- Types
  - OllamaUrl: string
  - State: 'running' | 'stopped' | 'starting' | 'error'
  - ErrorCode: согласно Error Table
  - OllamaStatus: { state: State; message?: string; errorCode?: ErrorCode; canStartLocal?: boolean }

- Dependencies (DI)
  - FetchLike: (input: string, init?: { method?: string; headers?: Record<string,string>; body?: string; signal?: AbortSignal }) => Promise<Response>
  - ProcessRunner: { exists(command: string): Promise<boolean>; start(command: string, args: string[], options?: { cwd?: string; env?: Record<string,string> }): Promise<StartedProcess> }
  - StartedProcess: { pid: number; exited: Promise<{ code: number | null; signal: string | null }>; stdout?: AsyncIterable<string>; stderr?: AsyncIterable<string>; stop?: () => Promise<void> }
  - Sleeper: { sleep(ms: number): Promise<void> }
  - Platform: { isMacOS: boolean }

- HealthCheck API
  - checkOllamaStatus(deps: { fetch: FetchLike }, opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<OllamaStatus>
  - Транспорт: HTTP GET к лёгкому эндпоинту (например, `${ollamaUrl}/api/version`) с AbortSignal и тайм-аутом.

- Start API
  - canStartLocal(ollamaUrl: OllamaUrl, deps: { platform: Platform }): boolean — true только для localhost URL на macOS.
  - startOllama(deps: { runner: ProcessRunner; platform: Platform }, opts?: { signal?: AbortSignal }): Promise<{ ok: boolean; message?: string; errorCode?: ErrorCode }>
    - Команда: "ollama" с фиксированными аргументами ["serve"]. Никаких пользовательских строк.
    - Если runner.exists("ollama") = false → { ok: false, errorCode: 'ollama-not-found' }.

- Wait API / Orchestrator
  - waitUntilOllamaReady(deps: { fetch: FetchLike; sleeper: Sleeper }, opts?: { startDeadlineMs?: number; pollIntervalMs?: number; maxAttempts?: number; signal?: AbortSignal }): Promise<OllamaStatus>
    - Повторные вызовы checkOllamaStatus() до 'running' или дедлайна; при отмене — 'user-cancelled'.
