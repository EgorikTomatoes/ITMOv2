# Tasks: ollama-precheck-logic

**Input**: Design documents from `/specs/002-ollama-precheck-logic/`

Sources to honor for requirements:
- Logic spec: specs/002-ollama-precheck-logic/spec.md
- UI spec: specs/001-ollama-precheck-ui/spec.md
- Contract: evidence/homework5/contract.md

## Format: `[ID] [P?] [Story] Description`

- [P]: Can run in parallel (different files, no dependencies)
- [Story]: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Ensure docs and tooling are ready; no application code changes yet.

- [ ] T001 Verify contract/specs present and linked in plan.md (specs/002-ollama-precheck-logic/plan.md)
- [ ] T002 Ensure test build works: run `npm run test` and record baseline (root) — no code changes
- [ ] T003 [P] Add test helpers skeleton file (no implementation) at vscode-extension/test/helpers/preflight-helpers.ts (exports DI stubs: fetchStub, processRunnerStub, sleeperStub)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish file layout and DI contracts (interfaces) referenced by tests. Implementations will follow after tests.

- [ ] T004 Create file scaffolds (empty exports) for logic layer:
  - vscode-extension/src/preflight/checkOllamaStatus.ts
  - vscode-extension/src/preflight/startOllama.ts
  - vscode-extension/src/preflight/waitUntilOllamaReady.ts
  - vscode-extension/src/preflight/types.ts (State, ErrorCode, OllamaStatus, StartResult per contract)
- [ ] T005 Create file scaffold for process adapter (no shell, macOS-only notes): vscode-extension/src/process/ollamaRunner.ts (exports ProcessRunner, StartedProcess types)
- [ ] T006 Create orchestrator scaffold to be called by command/UI: vscode-extension/src/preflight/orchestrator.ts (will wire UI to logic later)

**Checkpoint**: Foundation in place — tests can import contract types and function names.

---

## Phase 3: User Story 1 - Предпроверка и продолжение перевода (Priority: P1) 🎯 MVP

**Goal**: Health-check before translation; on running → continue existing translation unchanged.

**Independent Test**: `checkOllamaStatus()` returns { state: 'running' } ≤ 1.5s; orchestrator proceeds to current translate flow; no extra editor side-effects.

### Tests FIRST (write, run, see fail)

- [ ] T007 [P] [US1] Unit: tests for checkOllamaStatus success in vscode-extension/test/preflight/checkOllamaStatus.success.test.ts (mock fetch → ok JSON; assert state='running', no message/errorCode)
- [ ] T008 [P] [US1] Unit: tests for checkOllamaStatus error paths in vscode-extension/test/preflight/checkOllamaStatus.error.test.ts (HTTP ≥400 → errorCode='http-error'; timeout → 'health-timeout')
- [ ] T009 [US1] Integration: running-scenario orchestrator test in vscode-extension/test/preflight/orchestrator.running.test.ts (DI mocks; ensure after state='running' the existing translator path executes; preserve style selection behavior)
- [ ] T010 [US1] Verify “no translation/no document change on error” in vscode-extension/test/preflight/orchestrator.no-translate-on-error.test.ts (inject error from checkOllamaStatus; assert runTranslationCommand not invoked; editor untouched)

### Implementation (make tests pass)

- [ ] T011 [US1] Implement checkOllamaStatus in vscode-extension/src/preflight/checkOllamaStatus.ts (AbortSignal, timeout defaults per contract)
- [ ] T012 [US1] Implement minimal orchestrator guard in vscode-extension/src/preflight/orchestrator.ts to call checkOllamaStatus and, on running, delegate to existing translation flow without altering style selection
- [ ] T013 [US1] Wire orchestrator into extension entry in vscode-extension/src/extension.ts (preflight before style & translation) — ensure no UI text changes; logic only

**Checkpoint**: US1 independently functional; `npm run test` passes for US1; translation proceeds only on running.

---

## Phase 4: User Story 2 - Недоступность и запуск по запросу (Priority: P2)

**Goal**: On stopped, allow explicit start, show starting, then wait until running with deadline.

**Independent Test**: Stopped → startOllama ok → waitUntilOllamaReady → running ≤ 15s; cancel path returns user-cancelled; no document changes on cancel.

### Tests FIRST (write, run, see fail)

- [ ] T014 [P] [US2] Unit: stopped + cancel in vscode-extension/test/preflight/orchestrator.stopped.cancel.test.ts (checkOllamaStatus → stopped; AbortSignal aborts start/wait; expect errorCode='user-cancelled')
- [ ] T015 [P] [US2] Unit: stopped + successful start in vscode-extension/test/preflight/orchestrator.stopped.start.success.test.ts (canStartLocal=true; startOllama ok; waitUntilOllamaReady → running; then proceed to translation)
- [ ] T016 [US2] Unit: process adapter runner.exists path in vscode-extension/test/preflight/processAdapter.exists.test.ts (ollama present vs missing stubs)

### Implementation (make tests pass)

- [ ] T017 [US2] Implement startOllama in vscode-extension/src/preflight/startOllama.ts (macOS-only; PATH check; fixed args; safe spawn via ProcessRunner)
- [ ] T018 [US2] Implement waitUntilOllamaReady in vscode-extension/src/preflight/waitUntilOllamaReady.ts (poll every ~500ms; deadline ≤15s; AbortSignal)
- [ ] T019 [US2] Implement process adapter in vscode-extension/src/process/ollamaRunner.ts (ProcessRunner/StartedProcess with exists/start; no shell concat; DI-friendly)
- [ ] T020 [US2] Extend orchestrator to handle stopped → starting → running with cancellation and deadlines in vscode-extension/src/preflight/orchestrator.ts

**Checkpoint**: US2 independently functional; explicit start works; cancel safe; `npm run test` passes for US2.

---

## Phase 5: User Story 3 - Сбоевые сценарии старта (Priority: P2)

**Goal**: Robust failure handling for startup.

**Independent Test**: Missing PATH, start error, wait timeout; no translation/document changes.

### Tests FIRST (write, run, see fail)

- [ ] T021 [P] [US3] Unit: отсутствие ollama в PATH in vscode-extension/test/preflight/start.missing-path.test.ts (startOllama → { ok:false, errorCode:'ollama-not-found' })
- [ ] T022 [P] [US3] Unit: ошибка запуска процесса in vscode-extension/test/preflight/start.error.test.ts (start fails/exit non-zero → errorCode:'start-failed')
- [ ] T023 [US3] Unit: тайм-аут ожидания готовности in vscode-extension/test/preflight/wait.timeout.test.ts (waitUntilOllamaReady → errorCode:'start-timeout')
- [ ] T024 [US3] Integration: no-translation on failures in vscode-extension/test/preflight/orchestrator.no-translate-on-failure.test.ts (ensure editor untouched)

### Implementation (make tests pass)

- [ ] T025 [US3] Handle ENOENT path in startOllama and return proper errorCode/message (vscode-extension/src/preflight/startOllama.ts)
- [ ] T026 [US3] Propagate start-failed from process adapter to wait/until (vscode-extension/src/process/ollamaRunner.ts & src/preflight/waitUntilOllamaReady.ts)
- [ ] T027 [US3] Ensure orchestrator enforces no-translation on any error/cancel (vscode-extension/src/preflight/orchestrator.ts)

**Checkpoint**: US3 independently functional; all failure scenarios covered; `npm run test` passes for US3.

---

## Phase N: Polish & Cross-Cutting

- [ ] T028 [P] Document quick manual end-to-end scenario in specs/002-ollama-precheck-logic/quickstart.md (steps: UI precheck → start → wait → run translate; DI-based instructions; no real Ollama required)
- [ ] T029 Add CI convenience: document `npm run check` (package scripts already include check) and ensure it’s run locally; capture result in specs/002-ollama-precheck-logic/quickstart.md
- [ ] T030 Final parallel run: `npm run check` and review all tests green

---

## Phase 6: Convergence

- [ ] T031 Remove hard-coded UI error message in vscode-extension/src/extension.ts and delegate presentation to UI: make preflight wiring return status to the existing UI flow without introducing new UI texts (per contract: Responsibilities; UI spec FR-004). (contradicts)
- [ ] T032 Expose full OllamaStatus from orchestrator: update vscode-extension/src/preflight/orchestrator.ts to return { state, errorCode?, message?, canStartLocal? } as per contract (Data Types; Operation Signatures); adjust callers. (partial)
- [ ] T033 Refine checkOllamaStatus classification: in vscode-extension/src/preflight/checkOllamaStatus.ts, return errorCode 'http-error' for HTTP ≥400, 'health-timeout' on timeout, and 'network-error' for other network failures; return 'stopped' only when connection is refused/unreachable; include message; preserve canStartLocal. (missing)
- [ ] T034 Enforce process lifecycle semantics: implement/start integrating safe termination of only the process started by this command upon failure/timeout/cancel, and map waitUntilOllamaReady outcomes to 'start-failed' and 'port-busy' when applicable (files: vscode-extension/src/process/ollamaRunner.ts, vscode-extension/src/preflight/waitUntilOllamaReady.ts, orchestrator). (missing)
- [ ] T035 Add AbortSignal plumbing to orchestrator and propagate to check/start/wait: update vscode-extension/src/preflight/orchestrator.ts to accept a signal and pass it through, returning errorCode 'user-cancelled' on abort (per contract: Operation Signatures; State Transition Table). (missing)

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): None
- Foundational (Phase 2): Blocks US1–US3 (provides files & types)
- US1 (Phase 3): MVP; independent after Phase 2
- US2 (Phase 4): Depends on US1 orchestrator guard; otherwise independent
- US3 (Phase 5): Depends on US2 start/wait implementations
- Polish: After US1–US3

### User Story Dependencies

- US1 → US2 → US3 (sequential by priority)

### Parallel Opportunities

- [P] tests within a story can run in parallel (different files)
- Process adapter (T019) can be developed in parallel with wait implementation (T018) once interfaces agreed
- Documentation (T028) can run in parallel after US1

---

## Implementation Strategy

### MVP First (US1 Only)

1) Complete Phases 1–2
2) Write tests T007–T010; see them fail
3) Implement T011–T013
4) Validate with `npm run test`

### Incremental

- Add US2 tests (T014–T016) then implementations (T017–T020)
- Add US3 tests (T021–T024) then implementations (T025–T027)
- Finish with Polish (T028–T030)
