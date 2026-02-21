# Django Admin Login: Why It Fails and How to Fix It

## What We Discovered

When trying to log into Django admin at `https://gymbuddy-api-xxxxx.run.app/admin/`, login kept failing with "Please enter the correct email and password" even after creating a superuser and resetting the password multiple times.

**Root cause:** Cloud Run was using **SQLite**, not Cloud SQL PostgreSQL. `DATABASE_URL` was not set, so Django fell back to an ephemeral SQLite file inside the container. That means:

- Every deploy, restart, or scale-to-zero **wipes the database**
- Any superuser you create locally (against Cloud SQL) never exists in production
- The admin login page loads, but there are no users in the production database

## How to Verify

Hit the debug endpoint (no auth required):

```
https://gymbuddy-api-1038994855355.us-central1.run.app/api/v1/debug-db/
```

- If you see `"engine": "django.db.backends.sqlite3"` and `"has_database_url": false` → Cloud Run is using SQLite. Fix below.
- If you see `"engine": "django.db.backends.postgresql"` and `"name": "gymbuddy"` → Cloud Run is correctly using Cloud SQL. Admin login should work once a superuser exists in that database.

## How to Fix

### 1. Create the `database-url` secret (if it doesn't exist)

The deploy script expects a secret named `database-url` in Secret Manager. Create it with your Cloud SQL connection string (replace `YOUR_DB_PASSWORD` with your actual postgres password):

```bash
echo -n "postgresql://postgres:YOUR_DB_PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db" | \
  gcloud secrets create database-url --data-file=- --replication-policy=automatic --project=soultrust-gymbuddy
```

If the secret already exists and you need to update it:

```bash
echo -n "postgresql://postgres:YOUR_DB_PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db" | \
  gcloud secrets versions add database-url --data-file=- --project=soultrust-gymbuddy
```

### 2. Grant the Cloud Run service account access to the secret

Get the service account Cloud Run uses:

```bash
gcloud run services describe gymbuddy-api --region us-central1 --project soultrust-gymbuddy --format="value(spec.template.spec.serviceAccountName)"
```

Grant it access to the secret (replace `SERVICE_ACCOUNT_EMAIL` with the output above):

```bash
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \
  --role="roles/secretmanager.secretAccessor" \
  --project=soultrust-gymbuddy
```

### 3. Redeploy

```bash
./scripts/deploy-api.sh
```

The deploy script already has `--set-secrets=DATABASE_URL=database-url:latest`, so redeploying will inject the secret.

### 4. Create the superuser in the correct database

With Cloud SQL Auth Proxy running locally:

```bash
cd gymbuddy-api
export DATABASE_URL="postgresql://postgres:YOUR_DB_PASSWORD@127.0.0.1:5432/gymbuddy"
python3 manage.py createsuperuser --noinput --username admin@gymbuddy.local
export DJANGO_SUPERUSER_EMAIL="admin@gymbuddy.local"
export DJANGO_SUPERUSER_PASSWORD="admin123"
python3 manage.py createsuperuser --noinput --username admin@gymbuddy.local
```

(Or use `createsuperuser` interactively if you prefer.)

### 5. Verify

1. Hit `/api/v1/debug-db/` again. You should see `"engine": "django.db.backends.postgresql"` and `"name": "gymbuddy"`.
2. Log in at `https://gymbuddy-api-xxxxx.run.app/admin/` with your superuser email and password.

## How to Avoid This in the Future

### Before first deploy

1. **Create the `database-url` secret** before deploying. The deploy script expects it; if it’s missing, Cloud Run will not have `DATABASE_URL` and will use SQLite.
2. **Verify the secret** exists:
   ```bash
   gcloud secrets describe database-url --project=soultrust-gymbuddy
   ```
3. **Ensure the Cloud Run service account** can access the secret (Step 2 above).

### After deploy

1. **Check the debug endpoint** after each deploy:
   ```bash
   curl https://gymbuddy-api-1038994855355.us-central1.run.app/api/v1/debug-db/
   ```
   Confirm `has_database_url: true` and `engine` is PostgreSQL.

### Two databases gotcha

Cloud SQL has two databases: `postgres` (default) and `gymbuddy` (created for the app). The `database-url` secret must point to `gymbuddy`, not `postgres`. If you run migrations or `createsuperuser` against `postgres` while Cloud Run uses `gymbuddy`, the superuser won’t exist in production.

Connection string format:

```
postgresql://postgres:PASSWORD@/gymbuddy?host=/cloudsql/soultrust-gymbuddy:us-central1:gymbuddy-db
                                              ^^^^^^^^
                                              must be gymbuddy
```

### Checklist

- [ ] Cloud SQL instance created
- [ ] Database `gymbuddy` created
- [ ] `database-url` secret created in Secret Manager
- [ ] Cloud Run service account has `secretmanager.secretAccessor` on `database-url`
- [ ] Deploy script uses `--set-secrets=DATABASE_URL=database-url:latest`
- [ ] Migrations run against the correct database (gymbuddy)
- [ ] Superuser created in the same database Cloud Run uses
- [ ] Debug endpoint shows PostgreSQL after deploy
