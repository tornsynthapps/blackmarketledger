#!/bin/bash

BASE_URL="https://ledger.tornsynthapps.workers.dev"

# Usage: ./login.sh <userId> <secretToken>
USER_ID=${1:-"3165209"} # Default to a sample user
SECRET_TOKEN=${2:-"ghost-pixel-shadow"}

echo "Testing /auth/login for userId: $USER_ID"
curl -X POST "$BASE_URL/auth/login" \
     -H "Content-Type: application/json" \
     -d "{\"userId\": \"$USER_ID\", \"secretToken\": \"$SECRET_TOKEN\"}" | jq .
