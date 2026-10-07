.PHONY: check setup run lint test js-check mcp-demo

setup:
	ollama create variable-translator -f Modelfile

run:
	python3 -m variable_translator

lint:
	python3 -m ruff check variable_translator mcp_server tests
	python3 -m ruff format --check variable_translator mcp_server tests

test:
	python3 -m unittest discover -s tests -v

js-check:
	npm --prefix vscode-extension run check

mcp-demo:
	python3 -m mcp_server.demo_client

check: lint test js-check
