import io
import json
import unittest
from unittest.mock import patch

from variable_translator.translator import (
    TranslationError,
    VariableTranslator,
    format_identifier,
)


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class FormatIdentifierTests(unittest.TestCase):
    def test_supported_styles(self):
        self.assertEqual(format_identifier("current user name"), "current_user_name")
        self.assertEqual(
            format_identifier("current user name", "camel"), "currentUserName"
        )
        self.assertEqual(
            format_identifier("current_user_name", "pascal"), "CurrentUserName"
        )
        self.assertEqual(
            format_identifier("current-user-name", "constant"), "CURRENT_USER_NAME"
        )

    def test_numeric_prefix(self):
        self.assertEqual(format_identifier("42 answers"), "value_42_answers")

    def test_empty_response(self):
        with self.assertRaises(TranslationError):
            format_identifier("---")


class TranslatorTests(unittest.TestCase):
    @patch("variable_translator.translator.urlopen")
    def test_ollama_response_is_formatted(self, mocked_urlopen):
        body = json.dumps({"response": "number of active users"}).encode()
        mocked_urlopen.return_value = FakeResponse(body)

        result = VariableTranslator().translate(
            "количество активных пользователей", "camel"
        )

        self.assertEqual(result, "numberOfActiveUsers")
        request = mocked_urlopen.call_args.args[0]
        self.assertIn("количество активных пользователей", request.data.decode())

    def test_empty_phrase_is_rejected(self):
        with self.assertRaises(TranslationError):
            VariableTranslator().translate("   ")


if __name__ == "__main__":
    unittest.main()
