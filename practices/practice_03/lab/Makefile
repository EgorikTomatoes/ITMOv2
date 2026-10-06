PYTHON ?= $(shell for candidate in python3 python3.14 python3.13 python3.12 python3.11 python3.10; do \
	if command -v "$$candidate" >/dev/null 2>&1 && \
		"$$candidate" -c 'import sys; raise SystemExit(sys.version_info < (3, 10))' >/dev/null 2>&1; then \
		printf '%s' "$$candidate"; \
		break; \
	fi; \
done)

.PHONY: install model test demo

install:
	@test -n "$(PYTHON)" || { echo "Python 3.10+ required"; exit 1; }
	@$(PYTHON) -c "import sys; assert sys.version_info >= (3, 10), 'Python 3.10+ required'; print(f'Python {sys.version_info.major}.{sys.version_info.minor}: standard library only, ready')"

model:
	ollama create itmo-chat -f Modelfile

test: install
	$(MAKE) -C demo PYTHON="$(PYTHON)" test

demo:
	./demo/run-demo.sh
