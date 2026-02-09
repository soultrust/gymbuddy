# Cloud Run Debug Guide

## Step 1: Rebuild and Deploy

From `gymbuddy-api`:

```bash
gcloud builds submit --tag gcr.io/soultrust-gymbuddy/gymbuddy-api
gcloud run deploy gymbuddy-api --image gcr.io/soultrust-gymbuddy/gymbuddy-api --region us-central1 --allow-unauthenticated --timeout 300 --cpu-boost --set-secrets="/secrets/firebase-service-account.json=firebase-service-account:latest" --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-service-account.json"
```

## Step 2: Get Logs via Terminal

After deploy fails, run this to see the actual log output:

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="gymbuddy-api"' --limit=50 --format="table(timestamp,textPayload)" --project=soultrust-gymbuddy --freshness=10m
```

Or to stream logs as JSON (easier to read):

```bash
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="gymbuddy-api"' --limit=50 --format=json --project=soultrust-gymbuddy --freshness=10m | head -200
```

## Step 3: What to Look For

The Dockerfile now adds debug output. In the logs you should see:

- `=== /app contents ===` followed by `ls -la` output — confirms if manage.py exists
- `=== Running migrate ===` — if migrations fail, the error appears here
- `=== Starting gunicorn ===` — if you see this, gunicorn is starting (or about to crash)

Share the log output to diagnose the exact failure.
