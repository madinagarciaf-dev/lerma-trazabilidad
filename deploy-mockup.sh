#!/usr/bin/env bash
# Deploy a mockup to Azure Blob Storage static website
# Usage: ./deploy-mockup.sh <nombre-mockup>
# Example: ./deploy-mockup.sh lerma-trazabilidad-2026-04

set -e

STORAGE_ACCOUNT="pplmockups"
CONTAINER='$web'

if [ -z "$1" ]; then
  echo "Usage: ./deploy-mockup.sh <nombre-mockup>"
  echo "Example: ./deploy-mockup.sh lerma-trazabilidad-2026-04"
  exit 1
fi

MOCKUP_NAME="$1"
echo ">> Building with base /${MOCKUP_NAME}/ ..."
MSYS_NO_PATHCONV=1 MOCKUP_BASE="/${MOCKUP_NAME}/" npm run build

echo ">> Uploading to Azure: ${STORAGE_ACCOUNT}/${MOCKUP_NAME} ..."
az storage blob upload-batch \
  --source dist \
  --destination "$CONTAINER" \
  --destination-path "$MOCKUP_NAME" \
  --account-name "$STORAGE_ACCOUNT" \
  --auth-mode key \
  --overwrite

echo ""
echo ">> Deployed! URL:"
echo "   https://${STORAGE_ACCOUNT}.z6.web.core.windows.net/${MOCKUP_NAME}/"
