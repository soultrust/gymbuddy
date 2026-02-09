# Firebase Hosting Setup for GymBuddy Web

Step-by-step guide to deploy `gym-buddy-web` to Firebase Hosting.

---

## Prerequisites

- Firebase project (e.g. **soultrust-gymbuddy** or **GymBuddy**)
- Node.js and npm installed

---

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

---

## Step 2: Log in to Firebase

```bash
firebase login
```

A browser window opens to sign in with your Google account.

---

## Step 3: Initialize Firebase in Your Project

From the **gym-buddy** project root (the folder that contains `gym-buddy-web`):

```bash
firebase init hosting
```

Answer the prompts:

| Prompt | Answer |
|--------|--------|
| **Select a default Firebase project** | Choose your project (e.g. GymBuddy or soultrust-gymbuddy) |
| **What do you want to use as your public directory?** | `gym-buddy-web/dist` |
| **Configure as a single-page app?** | Yes |
| **Set up automatic builds with GitHub?** | No (unless you want CI) |
| **File gym-buddy-web/dist/index.html already exists. Overwrite?** | No |

This creates `firebase.json` and `.firebaserc` at the project root.

---

## Step 4: Build the Web App

```bash
cd gym-buddy-web
npm run build
cd ..
```

This produces the `dist` folder with your production bundle.

---

## Step 5: Deploy to Firebase Hosting

From the **gym-buddy** project root:

```bash
firebase deploy --only hosting
```

When it finishes, you'll see something like:

```
Hosting URL: https://your-project-id.web.app
```

---

## Step 6: Test Your Deployed App

Open the Hosting URL in a browser. You should see the GymBuddy login screen.

**Note:** The app will call `http://localhost:8000/api/v1` by default. For production, create `gym-buddy-web/.env.production` with your API URL before building:

```
VITE_API_BASE_URL=https://your-api-url.run.app/api/v1
```

Then run `npm run build` again and redeploy with `firebase deploy --only hosting`.

---

## Quick Reference: Full Deploy

```bash
# From gym-buddy root
cd gym-buddy-web
npm run build
cd ..
firebase deploy --only hosting
```

---

## Troubleshooting

**"Firebase CLI not found"**  
- Run `npm install -g firebase-tools` again, or use `npx firebase` instead of `firebase`.

**"No project active"**  
- Run `firebase use your-project-id` to select your project.

**Blank page or 404**  
- Confirm the build output is in `gym-buddy-web/dist` and `firebase.json` points to it.
- For SPAs, ensure "Configure as a single-page app" was set to Yes.
