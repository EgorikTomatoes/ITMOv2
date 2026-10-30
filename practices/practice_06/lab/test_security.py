import json
import unittest

from service import Shop


class SecurityTests(unittest.TestCase):
    def setUp(self):
        self.shop = Shop()
        self.addCleanup(self.shop.close)

    def call(self, method, path, body=None, headers=None):
        with self.shop.lock:
            return self.shop.dispatch(method, path, body or {}, headers or {})

    def login(self, username="alice", password="learn-alice"):
        status, res = self.call("POST", "/login", {"username": username, "password": password})
        self.assertEqual(status, 200)
        return {"X-Token": res["token"]}

    def test_profile_idor_prevented(self):
        alice = self.login()
        status, data = self.call("GET", "/profile?id=2", headers=alice)
        # Expect forbidden or own-only; u/v version returns 200 -> test should fail before fixes
        self.assertEqual(status, 403)

    def test_orders_require_auth_and_scope(self):
        status, data = self.call("GET", "/orders")
        self.assertEqual(status, 401)

    def test_admin_export_requires_staff_session(self):
        # Client should not be able to spoof X-Role
        status, data = self.call("GET", "/admin/export", headers={"X-Role": "staff"})
        self.assertEqual(status, 403)

    def test_price_tampering_rejected(self):
        alice = self.login()
        status, order = self.call("POST", "/orders", {"product": "lamp", "price": 1}, headers=alice)
        self.assertEqual(status, 201)
        self.assertEqual(order["price"], 1500)

    def test_files_are_owner_only(self):
        alice = self.login()
        status, result = self.call("GET", "/files?user=bob&path=receipt.txt", headers=alice)
        self.assertEqual(status, 403)

    def test_logs_staff_only_and_redacted(self):
        status, logs = self.call("GET", "/debug/logs")
        self.assertEqual(status, 403)

    def test_reviews_escaped_to_prevent_xss(self):
        alice = self.login()
        self.call("POST", "/reviews", {"product": "chair", "text": "<b>ok</b><script>alert(1)</script>"}, headers=alice)
        status, html = self.call("GET", "/reviews/view", headers=alice)
        self.assertEqual(status, 200)
        self.assertNotIn("<script>", html)

    def test_sqli_blocked_in_profile(self):
        alice = self.login()
        status, data = self.call("GET", "/profile?id=1 OR 1=1", headers=alice)
        self.assertEqual(status, 400)

    def test_assistant_exec_guardrails(self):
        alice = self.login()
        # Customer must not export profiles
        status, data = self.call("POST", "/assistant/execute", {"decision": {"tool": "export_profiles"}}, headers=alice)
        self.assertEqual(status, 403)
        # Customer must not delete files tree
        status, data = self.call("POST", "/assistant/execute", {"decision": {"tool": "delete_tree", "arguments": {"path": "."}}}, headers=alice)
        self.assertEqual(status, 403)
        # Customer may not read other user's file
        status, data = self.call("POST", "/assistant/execute", {"decision": {"tool": "read_file", "arguments": {"path": "files/bob/receipt.txt"}}}, headers=alice)
        self.assertEqual(status, 403)

    def test_assistant_context_scoped_to_owner(self):
        alice = self.login()
        status, ctx = self.call("GET", "/assistant/context?order_id=2", headers=alice)
        self.assertIn(status, (400, 401, 403))


if __name__ == "__main__":
    unittest.main()
