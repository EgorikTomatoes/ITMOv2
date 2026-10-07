"""Make real MCP calls to the local stdio server for the homework demo."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parents[1]


def exchange(process: subprocess.Popen, message: dict) -> dict:
    assert process.stdin is not None
    assert process.stdout is not None
    process.stdin.write(json.dumps(message, ensure_ascii=False) + "\n")
    process.stdin.flush()
    response = process.stdout.readline()
    if not response:
        raise RuntimeError("MCP server closed stdout without a response")
    return json.loads(response)


def tool_call(request_id: int, candidate: str, style: str) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "tools/call",
        "params": {
            "name": "inspect_identifier",
            "arguments": {"candidate": candidate, "style": style},
        },
    }


def main() -> None:
    process = subprocess.Popen(
        [sys.executable, "-m", "mcp_server.server"],
        cwd=PROJECT_DIR,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    try:
        initialize = exchange(
            process,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-06-18",
                    "capabilities": {},
                    "clientInfo": {"name": "homework-demo", "version": "1.0"},
                },
            },
        )
        success = exchange(process, tool_call(2, "number_of_active_users", "snake"))
        invalid = exchange(process, tool_call(3, "42 пользователя", "snake"))

        print("INITIALIZE")
        print(json.dumps(initialize, ensure_ascii=False, indent=2, sort_keys=True))
        print("SUCCESSFUL TOOL CALL")
        print(json.dumps(success, ensure_ascii=False, indent=2, sort_keys=True))
        print("INVALID INPUT TOOL CALL")
        print(json.dumps(invalid, ensure_ascii=False, indent=2, sort_keys=True))
    finally:
        process.terminate()
        process.wait(timeout=5)


if __name__ == "__main__":
    main()
