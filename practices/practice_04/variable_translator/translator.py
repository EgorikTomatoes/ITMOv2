"""Ollama client and identifier normalization."""

from __future__ import annotations

import json
import keyword
import re
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class TranslationError(RuntimeError):
    """Raised when the phrase cannot be translated."""


STYLES = ("snake", "camel", "pascal", "constant")


def _words(value: str) -> list[str]:
    value = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", value)
    return re.findall(r"[A-Za-z0-9]+", value)


def format_identifier(value: str, style: str = "snake") -> str:
    """Convert a model response to a valid identifier in the selected style."""
    if style not in STYLES:
        raise ValueError(f"Unknown style: {style}")

    words = _words(value)
    if not words:
        raise TranslationError("Модель не вернула английское имя переменной")

    words = [word.lower() for word in words]
    if style == "snake":
        result = "_".join(words)
    elif style == "camel":
        result = words[0] + "".join(word.capitalize() for word in words[1:])
    elif style == "pascal":
        result = "".join(word.capitalize() for word in words)
    else:
        result = "_".join(words).upper()

    if result[0].isdigit():
        result = "value_" + result
    if keyword.iskeyword(result):
        result += "_value"
    return result


@dataclass
class VariableTranslator:
    model: str = "variable-translator"
    base_url: str = "http://localhost:11434"
    timeout: float = 60.0

    def translate(self, phrase: str, style: str = "snake") -> str:
        phrase = phrase.strip()
        if not phrase:
            raise TranslationError("Введите непустое русское предложение")
        if style not in STYLES:
            raise TranslationError(f"Неизвестный стиль: {style}")

        prompt = (
            "Translate the Russian text into a short, precise English name for a code "
            "variable. Return only lowercase English words separated by spaces, "
            "without "
            f"quotes or explanations. Russian text: {phrase}"
        )
        payload = json.dumps(
            {"model": self.model, "prompt": prompt, "stream": False},
            ensure_ascii=False,
        ).encode("utf-8")
        request = Request(
            f"{self.base_url.rstrip('/')}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except HTTPError as error:
            details = error.read().decode("utf-8", errors="replace")
            raise TranslationError(
                f"Ollama вернула ошибку {error.code}: {details}"
            ) from error
        except URLError as error:
            raise TranslationError(
                "Не удалось подключиться к Ollama. Запустите `ollama serve` и создайте "
                "модель."
            ) from error
        except (json.JSONDecodeError, TimeoutError) as error:
            raise TranslationError(f"Некорректный ответ Ollama: {error}") from error

        response_text = data.get("response", "")
        return format_identifier(response_text, style)
