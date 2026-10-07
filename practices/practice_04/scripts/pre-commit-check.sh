#!/usr/bin/env bash

set -u

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "${script_dir}/.." && pwd)"

echo "[event] git pre-commit"
echo "[command] make -C ${project_dir} check"

if make -C "${project_dir}" check; then
  echo "[exit code] 0"
  echo "[result] automatic checks passed"
else
  exit_code=$?
  echo "[exit code] ${exit_code}"
  echo "[result] automatic checks failed; commit cancelled"
  exit "${exit_code}"
fi
