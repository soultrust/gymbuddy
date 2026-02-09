# GymBuddy: Google Cloud Free Tier Setup Guide

This guide walks you through deploying GymBuddy on Google's free tier: **Firebase Hosting** (web app) + **Cloud Run** (Django API).

---

## Prerequisites

- Google account
- [Node.js](https://nodejs.org/) and npm
- [Python 3](https://www.python.org/)
- [Docker](https://www.docker.com/products/docker-desktop/) (optional; Cloud Build can build without local Docker)
- [gcloud CLI](https://cloud.google.com/sdk/docs/install) installed and logged in

---

## Part 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/).

2. Click the project dropdown (top left) → **New Project**.

3. Name it (e.g. `gymbuddy-prod`) and click **Create**.

4. Ensure the new project is selected in the dropdown.

5. **Enable billing** (required even for free tier):
   - Go to **Billing** in the left menu.
   - Link or create a billing account.
   - Free tier usage stays within free limits; set budget alerts if desired.

---

## Part 2: Link Firebase to Your Project

1. Go to [Firebase Console](https://console.firebase.google.com/).

2. If your project (`soultrust-gymbuddy`) already exists:

   - Open **Project Settings** → **General**.
   - Under "Your apps", ensure the web app is configured.
   - Add your production domain to **Authorized domains** when you have it.

3. If starting fresh:
   - Click **Add project** and choose your existing GCP project, or create one.
   - Add a web app and copy the Firebase config.

---

## Part 3: Deploy the Django API to Cloud Run

### 3.1 Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 3.2 Prepare the API for Production

1. **Environment variables** – Cloud Run will need:

   - `DATABASE_URL` (if using Cloud SQL later; for now SQLite is fine for testing)
   - `GOOGLE_APPLICATION_CREDENTIALS` or the service account will be auto-injected
   - `ALLOWED_HOSTS` / `DEBUG` via Django settings

2. **Firebase service account** – The API needs the service account JSON to verify Firebase tokens. Options:

   - Mount as a secret in Cloud Run, or
   - Use a GCP secret and reference it at runtime

   For simplicity, we'll use a **Secret** in Cloud Run (see step 3.5).

### 3.3 Build and Deploy

The project includes a `Dockerfile` and `.dockerignore` in `gymbuddy-api/`. From the **gymbuddy** project root:

```bash
cd gymbuddy-api
gcloud run deploy gymbuddy-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

On first run, Cloud Build will use the `Dockerfile` and build the image. You’ll be prompted to enable the Cloud Build API if needed.

### 3.4 Get the API URL

After deployment, the output shows the service URL, e.g.:

```
https://gymbuddy-api-xxxxx-uc.a.run.app
```

Save this URL; you’ll use it as the API base URL in the web app.

### 3.5 Firebase Service Account for Cloud Run

The API needs the Firebase service account JSON to verify tokens. In Cloud Run, the file does not exist by default. Two options:

**Option A: Mount as a secret (recommended)**

1. Enable Secret Manager: `gcloud services enable secretmanager.googleapis.com`
2. GCP Console → **Secret Manager** → **Create Secret**.
3. Name: `firebase-service-account`.
4. Upload the contents of your `firebase-service-account.json`.
5. Grant the Cloud Run service account access to the secret (replace `PROJECT_ID` with your GCP project ID):

```bash
PROJECT_ID=your-gcp-project-id
gcloud secrets add-iam-policy-binding firebase-service-account \
  --member="serviceAccount:${PROJECT_ID}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

6. Redeploy with the secret mounted and the env var set:

```bash
gcloud run deploy gymbuddy-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets="/app/firebase-service-account.json=firebase-service-account:latest" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json"
```

The API will use this path to load the Firebase credentials.

**Option B: Environment variable (quick test only)**

Store the JSON content as a base64-encoded env var and decode it at runtime. Simpler but less secure; use only for quick testing.

---

## Part 4: Deploy the Web App to Firebase Hosting

### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
```

### 4.2 Configure Firebase Hosting

1. From the **gymbuddy** project root, run:

```bash
firebase init hosting
```

2. When prompted:

   - Select your Firebase project (e.g. `soultrust-gymbuddy`).
   - **Public directory:** `gymbuddy-web/dist`
   - **Single-page app:** Yes
   - **Overwrite index.html:** No (if it exists)

3. This creates `firebase.json` at the project root. It should look like:

```json
{
  "hosting": {
    "public": "gymbuddy-web/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"]
  }
}
```

### 4.3 Point the Web App to the Cloud Run API

Before building for production, create `gymbuddy-web/.env.production`:

```
VITE_API_BASE_URL=https://gymbuddy-api-xxxxx-uc.a.run.app/api/v1
```

Replace `gymbuddy-api-xxxxx-uc.a.run.app` with your actual Cloud Run URL from step 3.4. The web app already reads this variable; if unset, it defaults to `http://localhost:8000/api/v1` for local development.

### 4.4 Build and Deploy

```bash
cd gymbuddy-web
npm run build
cd ..
firebase deploy --only hosting
```

Run these from the **gymbuddy** project root (the parent of `gymbuddy-web`). The output will show your hosting URL, e.g. `https://your-project.web.app`.

---

## Part 5: Post-Deployment Configuration

### 5.1 Update Django Settings for Production

In `gymbuddy-api/django_project/settings.py`, set:

- **ALLOWED_HOSTS** – Add your Cloud Run host, e.g. `*.run.app` or the exact hostname.
- **CORS_ALLOWED_ORIGINS** – Add your Firebase Hosting URL (e.g. `https://your-project.web.app`).
- **DEBUG** – Set to `False` in production (e.g. via `DEBUG = os.environ.get("DEBUG", "") != "1"`).

You can pass these as environment variables in Cloud Run:

```bash
gcloud run services update gymbuddy-api \
  --region us-central1 \
  --set-env-vars "DEBUG=0"
```

For CORS and ALLOWED_HOSTS, you may need to update `settings.py` to read from env vars or use a production settings module.

### 5.2 Update Firebase Authorized Domains

1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**.
2. Add your Firebase Hosting domain (e.g. `your-project.web.app`).

---

## Part 6: Verify Everything Works

1. Open your Firebase Hosting URL.
2. Sign in with Firebase Auth.
3. Create a workout and add exercises – requests should hit the Cloud Run API.
4. Check Cloud Run logs if something fails: GCP Console → Cloud Run → your service → Logs.

---

## Summary of URLs

| Component       | URL                                              |
| --------------- | ------------------------------------------------ |
| Web app         | `https://your-project.web.app`                   |
| API (Cloud Run) | `https://gymbuddy-api-xxxxx-uc.a.run.app`        |
| Django Admin    | `https://gymbuddy-api-xxxxx-uc.a.run.app/admin/` |

---

## Cost & Free Tier

- **Firebase Hosting:** 10 GB storage, 360 MB/day transfer (free).
- **Cloud Run:** ~2M requests/month (free).
- **Firebase Auth:** 50K MAU (free).

Set up billing alerts in GCP Console → Billing → Budgets & alerts to avoid surprises.
