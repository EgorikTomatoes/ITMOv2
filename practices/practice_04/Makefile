.PHONY: check setup run lint test js-check

setup:
	ollama create variable-translator -f Modelfile

run:
	python3 -m variable_translator

lint:
	python3 -m ruff check variable_translator tests
	python3 -m ruff format --check variable_translator tests

test:
	python3 -m unittest discover -s tests -v

js-check:
	npm --prefix vscode-extension run check

check: lint test js-check
