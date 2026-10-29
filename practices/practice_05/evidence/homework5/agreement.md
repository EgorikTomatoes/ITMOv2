# Inter-Team Agreement: UI ↔ Logic Alignment for Ollama Precheck & Startup

Date: 2026-10-28

Artifacts compared:
- Before UI spec: evidence/homework5/before/ui-spec.md
- Before Logic spec: evidence/homework5/before/logic-spec.md
- After UI spec: evidence/homework5/after/ui-spec.md
- After Logic spec: evidence/homework5/after/logic-spec.md
- Accepted contract: evidence/homework5/contract.md

## Discovered Contradictions

1) State naming/semantics and exposure
- Before UI: UI перечислял «starting» как пользовательское состояние и показывал его текстом; не различал error-коды.
- Before Logic: «starting» использовался как промежуточное состояние в процессе запуска и не возвращался health-check; ошибки классифицированы детально (health-timeout, http-error, …), а UI-слой — владелец текстов.

2) Moment of check vs style selection
- Before UI: Явно требовал проверку до выбора стиля и ввода.
- Before Logic: Проверка до перевода описана, но UX порядок не был зафиксирован в контрактных терминах.

3) Data returned to UI
- Before UI: Не было поля canStartLocal; UI всегда предлагал «Запустить Ollama» при stopped/error.
- Before Logic: Предусматривал ограничение платформы/URL и функцию canStartLocal, но это не отражалось в UI.

4) User actions & availability
- Before UI: Всегда три действия («Запустить», «Повторить», «Отмена»), независимо от платформенных ограничений.
- Before Logic: Автозапуск только на macOS + localhost + наличие команды; при нарушении возвращались специфические ошибки.

5) Startup timeout and wait semantics
- Before UI: Неявно — «повторная проверка автоматически», без дедлайна/границ.
- Before Logic: Чёткие дедлайны/порог попыток, коды ошибок (start-timeout, start-failed).

6) Retry behavior
- Before UI: «Повторная проверка» перезапускает проверку, но без связи с логическими операциями.
- Before Logic: checkAvailability/ensure/wait чётко разграничены.

7) Cancellation semantics
- Before UI: Отмена гарантирует отсутствие изменений документа, но без связывания с сигналами отмены.
- Before Logic: Есть errorCode user-cancelled; длительные операции должны прерываться через AbortSignal.

8) Error texts and classification
- Before UI: Единый текст «Ollama недоступна»/«Не удалось подключиться…». Нет маппинга по errorCode.
- Before Logic: Таблица errorCode с программной семантикой и безопасными сообщениями.

9) Preservation of existing translation flow
- Both: Согласны, но UI не ссылался на контрактную норму.

## Human Decision (Accepted Contract)

Reference: evidence/homework5/contract.md

- Data Types: UI получает OllamaStatus { state ∈ running|stopped|starting|error, message?, errorCode?, canStartLocal? }.
- Operation Signatures: UI вызывает checkOllamaStatus; при stopped и canStartLocal=true — startOllama; затем waitUntilOllamaReady до running/error.
- State Transition Table: starting — прогресс; итоговые состояния для UI решений — running|stopped|error.
- Error Table: логика возвращает errorCode; UI маппит на локализованные тексты с рекомендациями по Retry/Start.
- Responsibilities: UI делает проверку до выбора стиля; при running — продолжает текущий сценарий; при ошибке/отмене — документ не меняется; «Запустить» — только если canStartLocal=true; отмена передаётся через AbortSignal и трактуется как user-cancelled.
- Timing and Defaults: health-check ≤1.5s; ожидание готовности ≤15s (≈500ms polling); UI не обязан настраивать значения.

## How Specs Changed

UI spec (after):
- Добавлена UI State Matrix с отсылками к контракту и явными текстами для running/starting/stopped/error.
- Уточнено, что «Запустить Ollama» показывается только при canStartLocal=true (контракт: Data Types / Responsibilities).
- Прописано, что Error текст зависит от errorCode; добавлен раздел «Ошибки и тексты» с маппингом на сообщения.
- Уточнены Acceptance Scenarios и Functional Requirements с ссылками на контракт (Operation Signatures, State Transition Table, Error Table, Compliance).
- Сделаны измеримые Success Criteria (SC-001..006) с привязкой к контракту и проверяемыми условиями.

Logic spec (after):
- Добавлены референсы на контракт и синхронизированы разделы с Operation Signatures, State Transition Table, Error Table.
- Явно зафиксировано, что checkOllamaStatus возвращает canStartLocal и безопасный message; startOllama/waitUntilOllamaReady принимают AbortSignal.
- Уточнены приёмочные сценарии с учётом user-cancelled и тайм-аутов; закреплён DI и ограничения платформы.

## Confirmations

- No code was created before agreement: изменения касались только спецификаций и артефактов в evidence/; исходный код расширения, тестов и build-скриптов не изменялся.

## Traceability (Pointers)

- Contract: evidence/homework5/contract.md
- UI Spec (before): evidence/homework5/before/ui-spec.md
- Logic Spec (before): evidence/homework5/before/logic-spec.md
- UI Spec (after): evidence/homework5/after/ui-spec.md
- Logic Spec (after): evidence/homework5/after/logic-spec.md
