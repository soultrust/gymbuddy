# Walkthrough: Persistent database so your data stops disappearing

Your project ID is **soultrust-gymbuddy**. Replace `YOUR_DB_PASSWORD` below with a strong password you choose (and remember).

---

## Step 1: Enable Cloud SQL and create the database (one-time)

Open a terminal. Make sure you're logged in and using the right project:

```bash
gcloud config set project soultrust-gymbuddy
```

Enable the Cloud SQL API:

```bash
gcloud services enable sqladmin.googleapis.com
```

Create a small PostgreSQL instance (takes a few minutes):

```bash
gcloud sql instances create gymbuddy-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1
```

Set the password for the `postgres` user (pick a strong password and replace `YOUR_DB_PASSWORD`):

```bash
gcloud sql users set-password postgres \
  --instance=gymbuddy-db \
  --password=YOUR_DB_PASSWORD
```

Create the database your app will use:

```bash
gcloud sql databases create gymbuddy --instance=gymbuddy-db
```

---

## Step 2: Get the instance’s public IP (for running migrations from your machine)

List the instance to get its public IP:

```bash
gcloud sql instances describe gymbuddy-db --format="value(ipAddresses[0].ipAddress)"
```

Copy that IP; you’ll use it in the next step.

---

## Step 2b: Create the `database-url` secret (one-time)

The deploy script injects `DATABASE_URL` from Secret Manager so the password never appears in the repo or deploy command. Create the secret once (replace `YOUR_DB_PASSWORD` with the same password you set in Step 1):

```bash
echo -n "postgresql://postgres:YOUR_DB_PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db" | \
  gcloud secrets create database-url --data-file=- --replication-policy=automatic
```

If the secret already exists (e.g. you're updating the password), add a new version:

```bash
echo -n "postgresql://postgres:YOUR_DB_PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db" | \
  gcloud secrets versions add database-url --data-file=-
```

Ensure the Cloud Run service account can read it (same project usually has access; if you see permission errors):

```bash
# Get the Cloud Run service account (e.g. PROJECT_NUMBER-compute@developer.gserviceaccount.com)
gcloud run services describe gymbuddy-api --region us-central1 --format="value(spec.template.spec.serviceAccountName)"
# Grant that identity access to the secret (replace SERVICE_ACCOUNT_EMAIL)
gcloud secrets add-iam-policy-binding database-url --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" --role="roles/secretmanager.secretAccessor"
```

---

## Step 3: Run Django migrations against Cloud SQL (one-time)

From your project root, go into the API folder:

```bash
cd gymbuddy-api
```

Set `DATABASE_URL` to point at the **public IP** (replace `PUBLIC_IP` and `YOUR_DB_PASSWORD`):

```bash
export DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@PUBLIC_IP:5432/gymbuddy"
```

Run migrations to create the tables in Cloud SQL:

```bash
python manage.py migrate
```

You should see migrations for `accounts`, `workouts`, etc. applied. Optional: create a superuser so you can use Django admin:

```bash
python manage.py createsuperuser
```

Then go back to the project root:

```bash
cd ..
```

---

## Step 4: Build and deploy Cloud Run with Cloud SQL

From the **project root** (the folder that contains `gymbuddy-api` and `scripts/`), run the deploy script. It builds the image and deploys with Cloud SQL and the `database-url` secret (create that in Step 2b first):

```bash
./scripts/deploy-api.sh
```

The script uses `--add-cloudsql-instances=soultrust-gymbuddy:us-central1:gymbuddy-db` and `--set-secrets=...,DATABASE_URL=database-url:latest`, so the app connects to Cloud SQL via the Unix socket and no password is stored in the repo or deploy command.

---

## Step 5: Confirm it works

1. Open your web or mobile app and log in. Create a workout or two.
2. Redeploy the service (run the deploy command again or trigger a new revision), then open the app again. Your data should still be there.

---

## Troubleshooting

- **“Connection refused” or “could not connect”**  
  Cloud Run must use the Unix socket. Ensure `DATABASE_URL` uses `?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db` and that `--add-cloudsql-instances=soultrust-gymbuddy:us-central1:gymbuddy-db` is on the deploy command.

- **Migrations not applied**  
  Run Step 3 again with the correct `DATABASE_URL` (public IP and password).

- **Permission denied on secret**  
  Ensure the Cloud Run service account can read both `firebase-service-account` and `database-url` (see Step 2b for granting `database-url`).
