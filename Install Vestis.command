#!/bin/bash
# One-time setup of Vestis on macOS: Claude Code, Claude login, Higgsfield, dependencies, build, and the Chrome
# extension steps. Node.js must be installed first (nodejs.org). Safe to run again: every step skips what is done.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
export PATH="$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"
step() { printf '\n\033[36m=== %s\033[0m\n' "$1"; }
say() { printf '\033[33m%s\033[0m\n' "$1"; }
higgsfield_state() { claude mcp list 2>&1 | grep '^higgsfield' || true; }

step '1/7  Node.js'
if ! command -v node >/dev/null; then
  say 'Node.js is missing. The download page opens now: install the LTS version, then run Install Vestis again.'
  open 'https://nodejs.org/en/download'
  exit 1
fi
node -v

step '2/7  Claude Code'
if ! command -v claude >/dev/null; then
  say 'Installing Claude Code...'
  curl -fsSL https://claude.ai/install.sh | bash
fi
claude --version

step '3/7  Sign in to Claude'
if ! claude auth status 2>/dev/null | grep -q '"loggedIn": *true'; then
  say 'A browser page opens: sign in with your Claude account (Pro or Max) and approve.'
  claude auth login
fi
echo 'Signed in.'

step '4/7  Higgsfield'
cd "$HOME"
if [ -z "$(higgsfield_state)" ]; then
  claude mcp add --transport http --scope user higgsfield https://mcp.higgsfield.ai/mcp
fi
if ! higgsfield_state | grep -q Connected; then
  say 'Claude opens in this window. Then:'
  say '  1. type  /mcp  and press Enter'
  say '  2. pick  higgsfield  and choose  Authenticate'
  say '  3. sign in to Higgsfield in the browser page that opens and approve'
  say '  4. back here, press Esc, type  /exit  and press Enter'
  read -r -p 'Press Enter to open Claude'
  claude
  if ! higgsfield_state | grep -q Connected; then
    say 'Higgsfield is still not connected. Run Install Vestis again and repeat step 4.'
    exit 1
  fi
fi
echo 'Higgsfield connected.'

step '5/7  App dependencies (a few minutes the first time)'
cd "$ROOT"
npm ci --no-fund --no-audit
npm --prefix server ci --no-fund --no-audit
npm --prefix web ci --no-fund --no-audit

step '6/7  Build'
npm run build
echo 'Built.'

step '7/7  Chrome extension'
say 'In Chrome:'
say '  1. open  chrome://extensions'
say '  2. turn on  Developer mode  (top right)'
say '  3. click  Load unpacked  and pick this folder:'
say "     $ROOT/extension"
say '  4. click the puzzle icon in the toolbar and pin Vestis'
open -R "$ROOT/extension"

printf '\n\033[32mAll set. Open Vestis with Start Vestis.command.\033[0m\n'
