Findings (ordered by severity)
- app/api.py:35-38 — No input validation. Accessing payload"diff" will raise KeyError and return 500 if the client omits the field or sends a non-JSON body. In FastAPI, define a Pydantic model to get automatic 422 responses and clear error messages.
- app/api.py:35-38 — Security exposure. New POST /api/reviews has no authentication, authorization, or rate limiting. This endpoint can be abused to drive LLM usage (cost), and accepts arbitrary diffs that will be fed to the LLM. If this is not intended to be public, add auth and basic abuse protection.
- app/api.py:35-38 — Potential DoS and cost risk from large payloads. There’s no maximum payload size or guarding against diffs that exceed LLM token limits. Requests may fail, hang, or incur high cost. Enforce body size limits and chunk/summarize diffs before sending to the LLM.
- app/api.py:35-38 and app/review_service.py:19-22 — No error handling. If LLM.generate raises or times out, the API will return 500 without a meaningful error. Wrap with try/except and return a controlled HTTP error (e.g., 502/504) with a safe message.
- app/review_service.py:19-22 — Prompt quality and injection risk. The prompt is vague and directly inlines untrusted diff content. This is susceptible to prompt injection and produces unstructured, varying outputs. Delimit user content, add clear instructions for structured output (e.g., JSON with file/line references and severities), and constrain what the model can produce.
- app/review_service.py:19-22 — Response schema is underspecified. Returning {"comment": "..."} is brittle and likely insufficient for downstream consumers (no severity, file/line, codes). Define and document a stable schema (e.g., {"findings": {"file": ..., "line": ..., "severity": ..., "message": ...}, "summary": ...}).
- app/api.py:35-38 and app/review_service.py:19-22 — Python version compatibility. Using dictstr, str requires Python 3.9+. If the project/runtime targets 3.8, this will crash. Use typing.Dict or enable from future import annotations.
- app/api.py:35-38 — No request/response models for OpenAPI. Using raw dicts reduces generated docs quality and client usability. Define pydantic models for the request and response to improve API documentation and validation.
- Observability — No logging or tracing around LLM calls. Lacks metrics for latency, error rates, and token usage. Add minimal structured logging and, if applicable, tracing/metrics hooks.
- Minor/nit, app/review_service.py:10-13 — The Protocol method body change is functionally neutral and adds noise. Keep style consistent with repo conventions (inline ellipsis vs multiline).
Open questions
1. What Python version/runtime do we target? If ≤3.8, update type hints or add future annotations.
2. Is /api/reviews intended to be public or internal? What auth is required?
3. What response schema do downstream consumers expect? Do they need file/line references, severities, or machine-readable JSON?
4. What is the acceptable max diff size and desired behavior for oversized diffs?
5. How should LLM errors be surfaced to clients (status codes and messages)?
Suggested minimal changes
- Define request/response models:
- Request: {"diff": str}
- Response: a structured schema (e.g., findings list)
- Validate input and return 422 on bad payloads via Pydantic.
- Add basic error handling around LLM.generate and map to 502/504.
- Constrain payload size and handle over-limit cases gracefully.
- Improve the prompt with clear structure, delimiters for diff content, and JSON-only output instructions; escape or fence the diff.
- Gate the endpoint with auth or at least rate limiting if public.
- Ensure type hints match the supported Python version.
Testing gaps to cover
- POST /api/reviews with:
- Missing "diff" -> 422
- Oversized diff -> 413 or defined error
- LLM error -> 502/504
- Valid diff -> returns structured findings JSON
- Unit test ReviewService.review to verify prompt formatting and schema compliance.