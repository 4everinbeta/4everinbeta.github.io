#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
WORKER_DIR="$REPO_ROOT/worker"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler CLI not found. Installing globally..."
  npm install -g wrangler
fi

cd "$WORKER_DIR"
wrangler deploy --name "${WORKER_NAME:-4everinbeta-chat}"
