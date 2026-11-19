#!/bin/bash
# Double-click this file on a Mac to run Slack of the Rings.
# First run: installs dependencies and asks for your Slack tokens.

cd "$(dirname "$0")" || exit 1

# Pick up Node installed through nvm, which a double-click doesn't always load.
if ! command -v node >/dev/null 2>&1 && [ -s "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
fi

pause() { echo; read -n 1 -s -r -p "Press any key to close this window."; echo; }

if ! command -v node >/dev/null 2>&1; then
  echo "Slack of the Rings needs Node.js 18 or newer."
  echo "Install it from https://nodejs.org, then double-click this file again."
  pause
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing dependencies (first run only)..."
  npm install || { pause; exit 1; }
fi

if [ ! -f .env ]; then
  node setup.js || { pause; exit 1; }
fi

npm start
pause
