#!/usr/bin/env bash
# scripts/deploy_vercel.sh
# Usage:
#   export VERCEL_TOKEN=your_token
#   ./scripts/deploy_vercel.sh .env.production
#
# This script:
#  - optionally loads env vars from the provided .env.production file and uses 'vercel env add' to set them (requires vercel CLI)
#  - deploys the project using 'vercel --prod'
#
# Requirements:
#  - npm i -g vercel
#  - VERCEL_TOKEN environment variable (create in Vercel account -> Tokens)
#  - If you want automatic env creation, pass a .env.production path as argument (key=value per line)
#
set -e
ENV_FILE="$1"

if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
  echo "Loading env from $ENV_FILE"
  while IFS='=' read -r key value; do
    if [[ -z "$key" ]] || [[ "$key" == \#* ]]; then
      continue
    fi
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)
    echo "Adding env $key to Vercel (Production)"
    vercel env add "$key" "$value" production --token "$VERCEL_TOKEN" || echo "Failed to add $key (maybe exists)"
  done < "$ENV_FILE"
else
  echo "No env file provided or not found. Skipping env upload."
fi

echo "Deploying to Vercel (production)"
vercel --prod --confirm --token "$VERCEL_TOKEN"
