#!/bin/bash
# Starts Vestis (the built app, served by the server on 127.0.0.1:3100) and opens it in the browser.
# The window must stay open while Vestis is used; closing it stops Vestis.
ROOT="$(cd "$(dirname "$0")" && pwd)"
URL='http://127.0.0.1:3100'
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
cd "$ROOT"
is_up() { curl -sf "$URL/api/health" >/dev/null; }

if is_up; then
  open "$URL"
  exit 0
fi
if [ ! -d web/dist ] || [ ! -d server/dist ]; then
  echo 'Building Vestis...'
  npm run build || { read -r -p 'Build failed. Press Enter to close'; exit 1; }
fi

printf '\033[32mVestis is running. Keep this window open; close it to stop Vestis.\033[0m\n'
npm --prefix server run start &
for _ in $(seq 30); do
  if is_up; then open "$URL"; break; fi
  sleep 1
done
wait
