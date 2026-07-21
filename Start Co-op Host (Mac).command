#!/bin/bash
# Freedom Founder - Co-op Host (macOS)
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "============================================================"
  echo " Node.js is not installed yet."
  echo ""
  echo " 1. Go to https://nodejs.org"
  echo " 2. Download and install the \"LTS\" version."
  echo " 3. Then double-click this file again."
  echo "============================================================"
  echo ""
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi

echo ""
echo " Starting the co-op host... a browser window will open."
echo " Keep THIS window open during class. Close it to end the session."
echo ""
node "coop/coop-server.js"
