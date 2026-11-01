.PHONY: install test run

PYTHON ?= python3

install:
	@$(PYTHON) -c "import sys; assert sys.version_info >= (3, 10), 'Python 3.10+ required'; import sqlite3; print('Standard library only: ready')"

test: install
	PYTHONDONTWRITEBYTECODE=1 $(PYTHON) -m unittest -v

run:
	$(PYTHON) service.py
