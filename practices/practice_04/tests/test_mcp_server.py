import unittest

from mcp_server.server import dispatch


class MCPServerTests(unittest.TestCase):
    def call_tool(self, arguments):
        return dispatch(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "tools/call",
                "params": {
                    "name": "inspect_identifier",
                    "arguments": arguments,
                },
            }
        )

    def test_inspect_identifier_accepts_matching_snake_case(self):
        response = self.call_tool(
            {"candidate": "number_of_active_users", "style": "snake"}
        )

        self.assertNotIn("error", response)
        content = response["result"]["content"][0]
        self.assertEqual(content["type"], "text")
        self.assertIn('"valid": true', content["text"])
        self.assertIn('"normalized": "number_of_active_users"', content["text"])

    def test_inspect_identifier_reports_invalid_input_as_tool_error(self):
        response = self.call_tool({"candidate": "42 пользователя", "style": "snake"})

        self.assertNotIn("error", response)
        self.assertTrue(response["result"]["isError"])
        message = response["result"]["content"][0]["text"]
        self.assertIn("ASCII", message)

    def test_inspect_identifier_rejects_unknown_style(self):
        response = self.call_tool({"candidate": "user_name", "style": "kebab"})

        self.assertNotIn("error", response)
        self.assertTrue(response["result"]["isError"])
        self.assertIn("style", response["result"]["content"][0]["text"])

    def test_unknown_tool_is_json_rpc_error(self):
        response = dispatch(
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": "missing", "arguments": {}},
            }
        )

        self.assertEqual(response["error"]["code"], -32602)


if __name__ == "__main__":
    unittest.main()
