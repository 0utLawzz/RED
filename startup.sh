#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

node scripts/preview.mjs stop >/dev/null 2>&1 || true

if curl -sf -o /dev/null --max-time 2 http://127.0.0.1:8080/; then
  exit 0
fi

npm run dev >>/tmp/app-startup.log 2>&1 &
