#!/usr/bin/env python3
"""Collects before/after evidence by exercising the vulnerable/fixed Shop service via its dispatch.
Writes JSON/text files under practices/practice_06/evidence/<phase>/.

Usage: python3 scripts/collect_evidence.py before
       python3 scripts/collect_evidence.py after
"""

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parents[3] / 'lab'))
from service import Shop  # noqa: E402


def main(phase: str):
    base = Path(__file__).resolve().parents[1]
    out_dir = base / 'evidence' / phase
    out_dir.mkdir(parents=True, exist_ok=True)

    shop = Shop()
    try:
        def call(method, path, body=None, headers=None):
            with shop.lock:
                status, result = shop.dispatch(method, path, body or {}, headers or {})
            return {
                "request": {"method": method, "path": path, "body": body or {}, "headers": headers or {}},
                "response": {"status": status, "result": result},
            }

        # Log in users
        alice_login = call("POST", "/login", {"username": "alice", "password": "learn-alice"})
        bob_login = call("POST", "/login", {"username": "bob", "password": "learn-bob"})
        staff_login = call("POST", "/login", {"username": "staff", "password": "learn-staff"})
        alice = {"X-Token": alice_login["response"]["result"].get("token")}
        bob = {"X-Token": bob_login["response"]["result"].get("token")}
        staff = {"X-Token": staff_login["response"]["result"].get("token")}

        evidence = {}

        # 1. IDOR: Alice reads Bob's profile via id param
        evidence["idor_profile_alice_reads_bob"] = call("GET", "/profile?id=2", headers=alice)

        # 2. SQLi in /profile id parameter
        evidence["sqli_profile"] = call("GET", "/profile?id=1 OR 1=1", headers=alice)

        # 3. /orders listing without auth
        evidence["orders_list_noauth"] = call("GET", "/orders")

        # 4. Price tampering
        evidence["price_tampering"] = call("POST", "/orders", {"product": "lamp", "price": 1}, headers=alice)

        # 5. Role spoof via X-Role
        evidence["role_spoof_export"] = call("GET", "/admin/export", headers={"X-Role": "staff"})

        # 6. Files: Alice reads Bob receipt
        evidence["files_cross_user"] = call("GET", "/files?user=bob&path=receipt.txt", headers=alice)

        # 7. Files traversal to private note
        evidence["files_traversal_private"] = call("GET", "/files?user=..&path=private/operator-note.txt", headers=alice)

        # 8. Logs leak
        evidence["logs_leak"] = call("GET", "/debug/logs")

        # 9. XSS in reviews
        call("POST", "/reviews", {"product": "chair", "text": "<b>ok</b><script>alert(1)</script>"}, headers=alice)
        evidence["reviews_view_xss"] = call("GET", "/reviews/view", headers=alice)

        # 10. Assistant context SQLi and IDOR
        evidence["assistant_context_sqli"] = call("GET", "/assistant/context?order_id=1 OR 1=1", headers=alice)
        evidence["assistant_context_idor"] = call("GET", "/assistant/context?order_id=2", headers=alice)

        # 11. Assistant dangerous tool use by customer
        evidence["assistant_exec_export_profiles"] = call(
            "POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}}, headers=alice
        )
        evidence["assistant_exec_delete_tree"] = call(
            "POST", "/assistant/execute", {"decision": {"tool": "delete_tree", "arguments": {"path": "."}}}, headers=alice
        )
        evidence["assistant_exec_read_bob"] = call(
            "POST", "/assistant/execute",
            {"decision": {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}}}, headers=alice
        )

        # Save per-action files and a summary index
        for key, blob in evidence.items():
            (out_dir / f"{key}.json").write_text(json.dumps(blob, ensure_ascii=False, indent=2), encoding="utf-8")

        index = {
            "phase": phase,
            "actions": list(evidence.keys()),
        }
        (out_dir / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")

        print(f"Saved evidence to {out_dir}")
    finally:
        shop.close()


if __name__ == "__main__":
    phase = sys.argv[1] if len(sys.argv) > 1 else "before"
    if phase not in {"before", "after"}:
        print("Usage: collect_evidence.py [before|after]")
        sys.exit(2)
    main(phase)
