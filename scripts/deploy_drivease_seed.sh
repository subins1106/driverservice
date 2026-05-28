#!/usr/bin/env bash
set -euo pipefail

# Usage:
# 1) Authenticate: gcloud auth application-default login
# 2) bash scripts/deploy_drivease_seed.sh [project_id]

PROJECT_ID="${1:-drivease-2c384}"
SEED_FILE="$(cd "$(dirname "$0")" && pwd)/create_drivease_firestore_seed.json"

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud가 설치되어 있지 않습니다. 먼저 Google Cloud SDK를 설치하세요." >&2
  exit 1
fi

TOKEN="$(gcloud auth print-access-token)"
if [ -z "$TOKEN" ]; then
  echo "액세스 토큰을 발급할 수 없습니다. gcloud auth login 후 다시 시도하세요." >&2
  exit 1
fi

curl -sS -X POST \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data "@${SEED_FILE}" \
  "https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:commit"

echo "\nSeed commit sent for ${PROJECT_ID}."
