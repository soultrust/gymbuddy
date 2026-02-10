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

From the **project root** (the folder that contains `gymbuddy-api`), build the image:

```bash
gcloud builds submit --tag gcr.io/soultrust-gymbuddy/gymbuddy-api gymbuddy-api
```

Deploy with Cloud SQL attached and `DATABASE_URL` set. Replace `YOUR_DB_PASSWORD` with the same password you used in Step 1. Run this from the project root; do not commit this line to git.

```bash
gcloud run deploy gymbuddy-api \
  --image gcr.io/soultrust-gymbuddy/gymbuddy-api \
  --region us-central1 \
  --allow-unauthenticated \
  --timeout 300 \
  --cpu-boost \
  --add-cloudsql-instances=soultrust-gymbuddy:us-central1:gymbuddy-db \
  --set-secrets="/secrets/firebase-service-account.json=firebase-service-account:latest" \
  --set-env-vars "GOOGLE_APPLICATION_CREDENTIALS=/secrets/firebase-service-account.json,DATABASE_URL=postgresql://postgres:YOUR_DB_PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db"
```

(To use a secret for `DATABASE_URL` later: create a secret with the full URL, then in Cloud Console → Cloud Run → gymbuddy-api → Edit, add an env var that references the secret.)

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
  Ensure the Cloud Run service account can read the `firebase-service-account` secret (same as before). For DATABASE_URL we're passing it as an env var; if you switch to a secret later, grant that secret to the Cloud Run service account.
