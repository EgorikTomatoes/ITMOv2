#!/usr/bin/env bash

set -u

echo "[event] git pre-commit"
echo "[command] make -C practices/practice_04 check"

if make -C practices/practice_04 check; then
  echo "[exit code] 0"
  echo "[result] automatic checks passed"
else
  exit_code=$?
  echo "[exit code] ${exit_code}"
  echo "[result] automatic checks failed; commit cancelled"
  exit "${exit_code}"
fi
