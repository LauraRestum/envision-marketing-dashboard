# Envision Marketing Dashboard

Internal operations hub for the Envision Inc. Marketing & Communications team. Built for Laura Restum, Arlo Hoover, and Madison Neuhaus.

This is a team-only tool. Three users. No public access.

## Local Development Setup

```bash
# Install dependencies
npm install

# Copy environment variables template
cp .env.example .env

# Fill in your Firebase and API keys in .env (details below)

# Start development server
npm run dev
```

The app runs at `http://localhost:5173` by default.

## Environment Variables

Create a `.env` file in the project root (never commit this file). Each variable:

### Client-side (safe in browser, prefixed with VITE_)

| Variable | Where to get it |
|----------|----------------|
| `VITE_FIREBASE_API_KEY` | Firebase Console > Project Settings > General |
| `VITE_FIREBASE_AUTH_DOMAIN` | Same location |
| `VITE_FIREBASE_PROJECT_ID` | Same location |
| `VITE_FIREBASE_STORAGE_BUCKET` | Same location |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Same location |
| `VITE_FIREBASE_APP_ID` | Same location |

### Server-side only (Vercel env variables, never in browser)

| Variable | Where to get it |
|----------|----------------|
| `ANTHROPIC_API_KEY` | Anthropic Console |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console > Service Accounts > Generate New Key (JSON) |
| `CLICKUP_API_TOKEN` | ClickUp Settings > Apps > API Token |
| `META_ACCESS_TOKEN` | Meta Business Suite > Developer Settings |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer Portal |
| `TIKTOK_ACCESS_TOKEN` | TikTok Developer Portal |
| `RESEND_API_KEY` | Resend dashboard |
| `DASHBOARD_PASSWORD_HASH` | Generated via bcrypt (details in Password section) |
| `EXTERNAL_HUB_URL` | The URL of your external Marketing Resource Hub |

**Why secrets never go in the browser:** Any JavaScript running in a browser can be inspected by anyone with browser developer tools. If an API key is in browser code, it is public. Server-side keys stay on Vercel's servers, and the browser only talks to our own API routes, which then talk to external services. This keeps credentials safe from exposure.

## Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com) and create a new project
2. Enable **Cloud Firestore** (start in test mode for development, lock down rules before production)
3. Copy the Firebase config values into your `.env` file
4. Recommended Firestore security rules for production:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;  // Replace with proper rules before production
    }
  }
}
```

5. Create the initial config document manually in Firestore:
   - Collection: `config`, Document ID: `app`
   - Field: `passwordHash` (string) with a bcrypt hash of your chosen password
   - Generate a hash: `node -e "require('bcryptjs').hash('yourpassword', 10).then(console.log)"`

## Vercel Deployment

1. Connect this GitHub repo to Vercel
2. Vercel auto-detects the Vite framework
3. Add all server-side environment variables in Vercel Dashboard > Settings > Environment Variables
4. Deploy. The `/api` folder is automatically detected as Vercel Serverless Functions

## How to Rotate API Keys

1. Generate a new key from the relevant service dashboard
2. Go to Vercel Dashboard > Settings > Environment Variables
3. Update the relevant variable with the new key
4. Redeploy (Vercel > Deployments > Redeploy, or push any commit)
5. No code changes needed

## How to Change the Dashboard Password

Use the Settings page inside the dashboard:

1. Navigate to Settings
2. Enter your current password
3. Enter and confirm the new password
4. Save. All active sessions are signed out, and everyone re-enters the new password

## Phase Build Status

- [x] **Phase 1, Foundation (shell):** App shell, nav, routing, dark/light toggle, Firebase, password gate, Settings page
- [ ] **Phase 1, Foundation (modules):** Team & Tasks module, Meeting Notes module
- [ ] **Phase 2, Content Operations:** Content Calendar, Ensight Planner, Home Dashboard, Notification system
- [ ] **Phase 3, External Integration:** Inbox module, Email reply (Resend), ClickUp Projects
- [ ] **Phase 4, AI Features:** Social Formatter, AI Idea Generator, Ensight-to-Social handoff
- [ ] **Phase 5, Live Analytics:** Platform API integrations, charts, reports, competitor tracker

## Known Limitations

- **Social platform API approval:** Facebook, Instagram, TikTok, and LinkedIn API access requires developer app approval from each platform. This can take days to weeks. The Analytics module UI will be built with mock data first.
- **Competitor data is manual:** Social platforms do not allow API access to competitor data. Competitor follower counts and observations are entered manually.
- **Password gate is lightweight:** This is a simple bcrypt password check, not enterprise SSO. It protects against casual access. For a 3-person internal team, this is sufficient.
- **No file upload in V1:** Content Calendar asset fields are text descriptions, not file uploads.

## Architecture

```
src/
  components/
    auth/         Password gate login screen
    layout/       AppShell, TopNav, Sidebar, MobileTabBar
    common/       Shared UI components
    settings/     Settings-specific components
  context/        React context providers (Auth, Theme, Notifications)
  hooks/          Custom React hooks
  lib/            Firebase config, utilities
  pages/          Page-level components (one per module)
  styles/         Global CSS, design tokens

api/              Vercel Serverless Functions
  intake.js       External form submission receiver
  send-reply.js   Email reply via Resend
  clickup.js      ClickUp API proxy
  format.js       AI Social Formatter (Anthropic)
  ideas.js        AI Content Idea Generator (Anthropic)
```
