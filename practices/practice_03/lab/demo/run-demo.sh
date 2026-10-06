#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
mkdir -p ../results

questions=(
  "Как запустить тесты? Укажи файл-источник."
  "Что будет при пустом имени подписчика? Подтверди кодом."
  "Где реализован unsubscribe? Проверь предпосылку вопроса."
  "Какая CI-система запускает тесты? Если сведений нет, скажи об этом."
  "Сохраняются ли подписки после перезапуска процесса? Подтверди кодом."
)

project_dir=$PWD

for i in "${!questions[@]}"; do
  number=$((i + 1))
  output="../results/q${number}.jsonl"
  echo "[$number/5] ${questions[$i]}"
  opencode run \
    --model ollama/itmo-chat \
    --agent local-guide \
    --title "practice-03-q${number}" \
    --format json \
    "Рабочая директория проекта: $project_dir. Не изменяй этот путь. ${questions[$i]} Идентификаторы проверяй текстовым поиском; если поиск пуст, прямо сообщи об этом. После проверки обязательно заверши работу непустым текстовым ответом." >"$output"
done

echo "Результаты сохранены в lab/results/q1.jsonl–q5.jsonl"
