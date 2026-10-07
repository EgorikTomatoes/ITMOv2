"""A dependency-free MCP server exposed over newline-delimited stdio JSON-RPC."""

from __future__ import annotations

import json
import keyword
import re
import sys
from typing import Any, Dict, Optional

from variable_translator.translator import STYLES, TranslationError, format_identifier

PROTOCOL_VERSION = "2025-06-18"
TOOL_NAME = "inspect_identifier"

STYLE_PATTERNS = {
    "snake": re.compile(r"^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$"),
    "camel": re.compile(r"^[a-z][A-Za-z0-9]*$"),
    "pascal": re.compile(r"^[A-Z][A-Za-z0-9]*$"),
    "constant": re.compile(r"^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$"),
}


def _tool_result(text: str, *, is_error: bool, data: Optional[Dict] = None) -> Dict:
    result: Dict[str, Any] = {
        "content": [{"type": "text", "text": text}],
        "isError": is_error,
    }
    if data is not None:
        result["structuredContent"] = data
    return result


def inspect_identifier(arguments: Any) -> Dict:
    """Validate a proposed variable name and report its normalized form."""
    if not isinstance(arguments, dict):
        return _tool_result("arguments must be an object", is_error=True)

    candidate = arguments.get("candidate")
    style = arguments.get("style", "snake")
    if not isinstance(candidate, str) or not candidate.strip():
        return _tool_result("candidate must be a non-empty string", is_error=True)
    if style not in STYLES:
        return _tool_result(f"style must be one of: {', '.join(STYLES)}", is_error=True)
    if not candidate.isascii():
        return _tool_result(
            "candidate must contain ASCII English letters, digits, or underscores",
            is_error=True,
        )

    try:
        normalized = format_identifier(candidate, style)
    except TranslationError as error:
        return _tool_result(str(error), is_error=True)

    valid = bool(STYLE_PATTERNS[style].fullmatch(candidate)) and not keyword.iskeyword(
        candidate
    )
    data = {
        "candidate": candidate,
        "style": style,
        "valid": valid,
        "normalized": normalized,
    }
    return _tool_result(
        json.dumps(data, ensure_ascii=False, sort_keys=True),
        is_error=False,
        data=data,
    )


def _error(request_id: Any, code: int, message: str) -> Dict:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": {"code": code, "message": message},
    }


def dispatch(request: Any) -> Optional[Dict]:
    """Dispatch one MCP JSON-RPC message."""
    if not isinstance(request, dict):
        return _error(None, -32600, "Invalid Request")

    request_id = request.get("id")
    method = request.get("method")
    if request_id is None:
        return None
    if method == "initialize":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "identifier-inspector", "version": "1.0.0"},
            },
        }
    if method == "ping":
        return {"jsonrpc": "2.0", "id": request_id, "result": {}}
    if method == "tools/list":
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": {
                "tools": [
                    {
                        "name": TOOL_NAME,
                        "description": (
                            "Check whether a proposed English variable name matches "
                            "the requested naming style and show its normalized form."
                        ),
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "candidate": {
                                    "type": "string",
                                    "description": "Proposed English variable name",
                                },
                                "style": {
                                    "type": "string",
                                    "enum": list(STYLES),
                                    "default": "snake",
                                },
                            },
                            "required": ["candidate"],
                            "additionalProperties": False,
                        },
                    }
                ]
            },
        }
    if method == "tools/call":
        params = request.get("params")
        if not isinstance(params, dict) or params.get("name") != TOOL_NAME:
            return _error(request_id, -32602, "Unknown tool")
        return {
            "jsonrpc": "2.0",
            "id": request_id,
            "result": inspect_identifier(params.get("arguments", {})),
        }
    return _error(request_id, -32601, "Method not found")


def main() -> None:
    for line in sys.stdin:
        try:
            request = json.loads(line)
            response = dispatch(request)
        except json.JSONDecodeError:
            response = _error(None, -32700, "Parse error")
        except Exception as error:  # Keep the stdio server alive on malformed calls.
            response = _error(None, -32603, f"Internal error: {error}")
        if response is not None:
            print(json.dumps(response, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
