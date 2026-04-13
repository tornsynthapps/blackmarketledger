#!/bin/bash

BASE_URL="https://ledger.tornsynthapps.workers.dev"

# Usage: ./reset-token.sh <mode> <userId> <verificationToken(if verify)>
USER_ID=${1:-"3165209"}
MODE=${2:-"initiate"}
VERIF_TOKEN=${3:-""}

if [ "$MODE" == "verify" ]; then
    echo "Testing /auth/reset-token [verify] for token: $VERIF_TOKEN"
    curl -X POST "$BASE_URL/auth/reset-token" \
         -H "Content-Type: application/json" \
         -d "{\"mode\": \"verify\", \"verificationToken\": \"$VERIF_TOKEN\"}" | jq .
else
    echo "Testing /auth/reset-token [initiate] for userId: $USER_ID"
    curl -X POST "$BASE_URL/auth/reset-token" \
         -H "Content-Type: application/json" \
         -d "{\"mode\": \"initiate\", \"userId\": \"$USER_ID\"}" | jq .
fi
