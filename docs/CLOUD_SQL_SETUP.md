# Cloud SQL (PostgreSQL) Setup for GymBuddy

## Step 1: Create a Cloud SQL Instance

1. Go to [Google Cloud Console](https://console.cloud.google.com/) and select your project (or create one).

2. Enable the Cloud SQL Admin API:

   ```bash
   gcloud services enable sqladmin.googleapis.com
   ```

3. Create a PostgreSQL instance:

   ```bash
   gcloud sql instances create gymbuddy-db \
     --database-version=POSTGRES_15 \
     --tier=db-f1-micro \
     --region=us-central1
   ```

   - `db-f1-micro` is the smallest (and cheapest) tier. For production at scale, use `db-custom-1-3840` or higher.

4. Set the root password:

   ```bash
   gcloud sql users set-password postgres \
     --instance=gymbuddy-db \
     --password=YOUR_SECURE_PASSWORD
   ```

5. Create a database for your app:
   ```bash
   gcloud sql databases create gymbuddy --instance=gymbuddy-db
   ```

---

## Step 2: Get the Connection Details

1. In GCP Console → **SQL** → select `gymbuddy-db`.

2. Note the **Public IP address** (or use Private IP if your Cloud Run uses VPC).

3. For Cloud Run, you’ll connect via the **Cloud SQL Auth Proxy** or **Unix socket**. The connection name format is:
   ```
   PROJECT_ID:REGION:INSTANCE_NAME
   ```
   Example: `soultrust-gymbuddy:us-central1:gymbuddy-db`

---

## Step 3: Update Django

The project is already set up to use PostgreSQL when `DATABASE_URL` is set. For local testing, you can connect directly. For Cloud Run, use the Cloud SQL connector.

**Local development** – Set `DATABASE_URL` in your environment:

```bash
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@PUBLIC_IP:5432/gymbuddy"
```

Then run migrations:

```bash
cd gymbuddy-api
python manage.py migrate
python manage.py createsuperuser
```

---

## Step 4: Connect Cloud Run to Cloud SQL

1. When deploying Cloud Run, add the Cloud SQL connection:

   ```bash
   gcloud run deploy gymbuddy-api \
     --source . \
     --region us-central1 \
     --add-cloudsql-instances=PROJECT_ID:us-central1:gymbuddy-db \
     --set-env-vars "DATABASE_URL=postgresql://postgres:PASSWORD@/gymbuddy?host=/cloudsql/PROJECT_ID:us-central1:gymbuddy-db"
   ```

2. For the Unix socket connection, the format is:

   ```
   postgresql://USER:PASSWORD@/DATABASE_NAME?host=/cloudsql/CONNECTION_NAME
   ```

3. Store the password in Secret Manager and reference it in Cloud Run:

   ```bash
   # Create secret
   echo -n "your-db-password" | gcloud secrets create db-password --data-file=-

   # Deploy with secret
   gcloud run deploy gymbuddy-api \
     --set-secrets="DATABASE_URL=db-connection-string:latest"
   ```

   (You’d create a `db-connection-string` secret with the full connection URL.)

---

## Step 5: Migrate Existing Data (Optional)

If you have data in SQLite that you want to move:

1. Dump from SQLite: `python manage.py dumpdata --natural-foreign > backup.json`
2. Point Django at PostgreSQL (set `DATABASE_URL`).
3. Run `python manage.py migrate`.
4. Load: `python manage.py loaddata backup.json`

---

## Summary

| Step | Action                                                          |
| ---- | --------------------------------------------------------------- |
| 1    | Create Cloud SQL instance + database                            |
| 2    | Get connection name and credentials                             |
| 3    | Set `DATABASE_URL`, run migrations                              |
| 4    | Deploy Cloud Run with `--add-cloudsql-instances` and env/secret |
| 5    | (Optional) Migrate data from SQLite                             |
