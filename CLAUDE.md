# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

GymBuddy is a workout-tracking app with three independent projects in this monorepo, sharing one Django API:

- `gymbuddy-api/` — Django REST Framework backend (source of truth for data model and business logic)
- `gymbuddy-mobile/` — Expo/React Native app (Android-focused, distributed as a sideloaded APK via EAS)
- `gymbuddy-web/` — Vite + React + Tailwind web client

Both `gymbuddy-mobile` and `gymbuddy-web` are separate frontends for the same API and largely duplicate each other's data-fetching/mutation logic (e.g. `src/hooks/useWorkoutDetail.ts` and `src/lib/api.ts` / `src/api/client.ts` exist in both, hand-written independently, not shared code). **The mobile app is the more actively developed / feature-complete client** (stopwatch-timed exercises, per-exercise notes, rest timer overlay); the web app lags behind. When a feature request doesn't specify a platform, check whether it needs to land in one client or both, and don't assume parity between them.

## Commands

### API (`gymbuddy-api/`, Python 3.13, Django 6)

```bash
cd gymbuddy-api
python -m venv .venv && source .venv/bin/activate   # first time
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver                # local dev (SQLite, DEBUG=True by default)
python manage.py runserver 0.0.0.0:8000   # for a physical phone on the same network

python manage.py test                     # all tests
python manage.py test workouts            # one app
python manage.py test workouts.tests.ProgramTests.test_create   # single test
```

Local run requires a Firebase service-account JSON at `gymbuddy-api/firebase-service-account.json` (or `*-firebase-adminsdk-*.json`), downloaded from Firebase Console > Project Settings > Service Accounts — these filenames are gitignored, never commit one. Without `DATABASE_URL` set, the app falls back to local SQLite (`db.sqlite3`); this is why data disappears on Cloud Run if `DATABASE_URL` isn't wired up there (ephemeral container filesystem) — production always needs Cloud SQL via `DATABASE_URL`.

### Mobile (`gymbuddy-mobile/`, Expo 54 / RN 0.81)

```bash
cd gymbuddy-mobile
npm install
npx expo start              # or: npm run android / npm run ios / npm run web
npm test                    # vitest run (unit tests, e.g. src/utils/*.test.ts)
npm run test:watch
```

Points at the live Cloud Run API by default (`src/api/config.ts`). To use a local API from a device/emulator, set `EXPO_PUBLIC_API_HOST` (e.g. `192.168.1.x`, port 8000 is assumed) or `EXPO_PUBLIC_API_URL` as an env var.

Android release builds go through EAS, not a local build:

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform android --profile production
# then download the APK from expo.dev and sideload it
```

### Web (`gymbuddy-web/`, Vite + React 19 + Tailwind 4)

```bash
cd gymbuddy-web
npm install
npm run dev
npm run build     # tsc -b && vite build
npm run lint
npm test          # vitest run
```

API base URL comes from `VITE_API_BASE_URL` (defaults to `http://localhost:8000/api/v1`; `.env.production` points it at the live Cloud Run URL). Uses the `@/*` path alias to `src/*` (mobile does not have this alias — it uses relative imports).

### Deploy

```bash
./scripts/deploy-api.sh          # from repo root: Cloud Build + Cloud Run deploy for the API, with Cloud SQL and secrets wired up
cd gymbuddy-web && npm run build && firebase deploy   # web (Firebase Hosting)
```

The Cloud Build config (`cloudbuild.yaml`) must be invoked from the repo root (`gcloud builds submit --config=cloudbuild.yaml .`) since it builds `./gymbuddy-api` as Docker context. `DATABASE_URL` and the Firebase service account are pulled from Secret Manager (`database-url:latest`, `firebase-service-account:latest`) by the deploy script — never paste secrets into it or into env vars checked into git.

## API architecture

- **Auth**: Firebase Authentication (email/password) is the identity provider on both clients. Clients get a Firebase ID token, POST it to `/api/v1/auth/firebase-token/` (`firebase_auth.exchange_firebase_token`), and the API verifies it via the Firebase Admin SDK, then issues (or reuses) a DRF `Token` mapped through `accounts.models.UserIdentity` (`provider` + `provider_uid` → `User`). All subsequent requests use `Authorization: Token <key>`, not the Firebase token. `UserIdentity` exists so other providers (Google, Apple) can be added later without changing the `User` model — see the docstring in `firebase_auth.py` for the pattern to follow.
- **User matching**: on first Firebase login, the API prefers an existing `User` with the same email over creating a new one, so the same account/data is shared between the web and mobile clients regardless of which one a user signs up on.
- **Data model** (`workouts/models.py`): `Program` (optional grouping) → `Session` (one workout on a date) → `PerformedExercise` (an exercise done in that session, ordered, with `measure_unit` of `sets_reps` or `stopwatch`) → `SetEntry` (one set; `reps` doubles as elapsed seconds when `measure_unit == 'stopwatch'`). `Exercise` is a global, deduplicated master list (`get_or_create`d by name). `UserExerciseNote` holds one "note for next time" per user+exercise, auto-cleared once shown — see `_add_exercise`/`note_for_next_time` in `workouts/views.py`.
- **Ordering invariant**: `SetEntry.order` is unique per `PerformedExercise` (`unique_together`). Deleting a set (`SetEntryViewSet.perform_destroy`) reorders survivors in two passes (shift out of range, then compact) to avoid unique-constraint collisions — follow that pattern if you add similar reordering logic elsewhere.
- **Templating workouts**: creating a `Session` with `template_session_id` copies exercises/sets from a prior session (`WorkoutSessionViewSet._copy_session_as_template`). The `template`, `previous_exercises`, and `last_exercise_performance` custom actions all serve variations of "what did I do last time" for pre-filling the UI.
- All non-`Exercise` querysets are scoped to `request.user` in `get_queryset()` — new viewsets/actions must follow this or they'll leak data across users.
- Settings (`django_project/settings.py`): `DEBUG` and `SECRET_KEY` come from env vars in production; `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS` are hardcoded lists that need updating if hosting domains change. WhiteNoise serves static files (admin CSS etc.) directly from Cloud Run.

## Mobile/web client notes

- Both clients follow the same shape for API calls: a small `apiRequest<T>()` wrapper (`fetch` + 45s timeout + `Authorization: Token` header + JSON error unwrapping) and a `useWorkoutDetail` hook holding all workout-detail screen state/handlers. When fixing a bug in one, check whether the same bug exists in the other's copy.
- Mobile has extra concepts web doesn't yet have: `TimerContext`/`TimerOverlay`/`TimerFAB` (rest timer), `AccentContext` (per-user accent color), stopwatch-mode sets (minutes/seconds inputs), bodyweight exercises, and note-for-next-time editing UI.
- Mobile navigation is a single `NativeStack` with two screens (`Workouts`, `WorkoutDetail`) gated by `AuthContext`'s `token`; there's no deep linking. Web has no router — `App.tsx` toggles between `WorkoutsList` and `WorkoutDetail` by keeping local `selectedWorkoutId` state and hiding (not unmounting) the list to preserve its data.
