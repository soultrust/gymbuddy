#!/usr/bin/env bash
# Build and deploy gymbuddy-api to Cloud Run.
# Run from project root: ./scripts/deploy-api.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Building image from $ROOT..."
gcloud builds submit --config=cloudbuild.yaml .

echo "Deploying to Cloud Run (Cloud SQL + secrets)..."
gcloud run deploy gymbuddy-api \
  --image gcr.io/soultrust-gymbuddy/gymbuddy-api \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --timeout 300 \
  --cpu-boost \
  --add-cloudsql-instances=soultrust-gymbuddy:us-central1:gymbuddy-db \
  --set-secrets="/secrets/firebase-service-account.json=firebase-service-account:latest,DATABASE_URL=database-url:latest" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-service-account.json"

echo "Done."
