#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "Установите Node.js 20 или новее: https://nodejs.org"
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Устанавливаю зависимости, это займёт минуту..."
  npm install
fi

echo
echo "Конструктор меню: http://localhost:4317"
echo "Нажмите Ctrl+C, чтобы остановить сервер."
echo

if command -v open >/dev/null 2>&1; then
  (sleep 1 && open "http://localhost:4317") >/dev/null 2>&1 &
elif command -v xdg-open >/dev/null 2>&1; then
  (sleep 1 && xdg-open "http://localhost:4317") >/dev/null 2>&1 &
fi

npm run dev
