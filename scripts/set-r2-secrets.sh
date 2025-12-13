#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
KEY_FILE="${REPO_ROOT}/private/R2.key"

if [[ ! -f "$KEY_FILE" ]]; then
  echo "Missing $KEY_FILE" >&2
  exit 1
fi

declare -A secrets
while IFS='=' read -r key value; do
  key="${key//$'\r'/}"
  value="${value//$'\r'/}"
  [[ -z "$key" ]] && continue
  secrets["$key"]="$value"
done < "$KEY_FILE"

for key in account-id access-key-id secret-access-key; do
  if [[ -z "${secrets[$key]:-}" ]]; then
    echo "Key '$key' missing from $KEY_FILE" >&2
    exit 1
  fi
done

gh secret set CF_ACCOUNT_ID --body "${secrets[account-id]}"
gh secret set CF_R2_ACCESS_KEY --body "${secrets[access-key-id]}"
gh secret set CF_R2_SECRET_KEY --body "${secrets[secret-access-key]}"

echo "Cloudflare R2 secrets updated in this repository."
