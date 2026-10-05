"""Command-line interface."""

from __future__ import annotations

import argparse
import os
import sys

from .translator import STYLES, TranslationError, VariableTranslator


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Перевод русского текста в английское имя переменной."
    )
    parser.add_argument("phrase", nargs="*", help="русское предложение")
    parser.add_argument(
        "-s", "--style", choices=STYLES, default="snake", help="стиль имени"
    )
    parser.add_argument(
        "--model",
        default=os.getenv("OLLAMA_MODEL", "variable-translator"),
        help="имя модели Ollama",
    )
    parser.add_argument(
        "--url",
        default=os.getenv("OLLAMA_URL", "http://localhost:11434"),
        help="адрес Ollama API",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    phrase = " ".join(args.phrase).strip()
    if not phrase:
        try:
            phrase = input("Введите русское предложение: ").strip()
        except EOFError:
            phrase = ""

    translator = VariableTranslator(model=args.model, base_url=args.url)
    try:
        print(translator.translate(phrase, args.style))
    except TranslationError as error:
        print(f"Ошибка: {error}", file=sys.stderr)
        raise SystemExit(1) from error
