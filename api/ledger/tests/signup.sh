#!/bin/bash

BASE_URL="https://ledger.tornsynthapps.workers.dev"

# Usage: ./signup.sh <mode> <userId> <verificationToken(if verify)>
USER_ID=${1:-"3165209"}
MODE=${2:-"initiate-message"}
VERIF_TOKEN=${3:-""}

if [ "$MODE" == "verify" ]; then
    echo "Testing /auth/signup [verify] for token: $VERIF_TOKEN"
    curl -X POST "$BASE_URL/auth/signup" \
         -H "Content-Type: application/json" \
         -d "{\"mode\": \"verify\", \"verificationToken\": \"$VERIF_TOKEN\"}" | jq .
else
    echo "Testing /auth/signup [$MODE] for userId: $USER_ID"
    curl -X POST "$BASE_URL/auth/signup" \
         -H "Content-Type: application/json" \
         -d "{\"mode\": \"$MODE\", \"userId\": \"$USER_ID\"}" | jq .
fi
