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
| `RESEND_API_KEY` | Resend dashboard |
| `RESEND_FROM_ADDRESS` | Your sending email (default: marketing@envisionus.com) |
| `DASHBOARD_PASSWORD_HASH` | Generated via bcrypt (details in Password section) |
| `EXTERNAL_HUB_URL` | The URL of your external Marketing Resource Hub |

### Social platform analytics (require developer app approval)

| Variable | Where to get it | Approval needed |
|----------|----------------|-----------------|
| `META_ACCESS_TOKEN` | Meta Business Suite > Developer Settings | Meta app review |
| `META_FB_PAGE_ID` | Facebook Page > About > Page ID | Same approval |
| `META_IG_ACCOUNT_ID` | Instagram Business Account ID (via Meta API) | Same approval |
| `TIKTOK_ACCESS_TOKEN` | TikTok Developer Portal | TikTok app review |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn Developer Portal | LinkedIn app review |
| `LINKEDIN_ORG_ID` | LinkedIn Company Page admin panel | Same approval |

These API credentials require developer app approval from each platform, which can take days to weeks. The Analytics module works with sample data until credentials are added. Once approved, add the tokens to Vercel environment variables and redeploy.

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

- [x] **Phase 1, Foundation:** App shell, nav, routing, dark/light toggle, Firebase, password gate, Settings, Team & Tasks, Meeting Notes
- [x] **Phase 2, Dashboard & Notifications:** Home Dashboard bento grid, notification system with badge counts and bell dropdown
- [x] **Phase 3, External Integration:** Inbox module, email reply (Resend), ClickUp Projects live view
- [x] **Phase 4, Content & AI:** Content Calendar, Ensight Planner, Social Formatter (Claude API), AI Idea Generator
- [x] **Phase 5, Live Analytics:** Analytics module with charts, platform summary, top posts, competitor tracker, PDF export, API routes for Meta/TikTok/LinkedIn with Firestore caching

## Known Limitations

- **Social platform API approval (pending):** Facebook, Instagram, TikTok, and LinkedIn API access requires developer app approval from each platform. This can take days to weeks. The Analytics module displays realistic sample data until API credentials are configured. Once approved, add tokens to Vercel env variables and the module will switch to live data automatically.
- **Competitor data is manual:** Social platforms do not allow API access to competitor data. Competitor follower counts and observations are entered manually in the Analytics module.
- **Password gate is lightweight:** This is a simple bcrypt password check, not enterprise SSO. It protects against casual access. For a 3-person internal team, this is sufficient.
- **No file upload in V1:** Content Calendar asset fields are text descriptions, not file uploads.
- **Analytics trends are sample data until APIs connect:** The 30-day engagement chart shows generated sample data. Once platform APIs are connected, the chart will display real daily metrics from each platform.

## AI Skills System

The AI features (Social Formatter and Content Idea Generator) are powered by an external skills repo:

**Repo:** [LauraRestum/marketingskills](https://github.com/LauraRestum/marketingskills)

### How it works

At runtime, when `/api/format.js` or `/api/ideas.js` receives a request, it fetches the relevant skill files directly from GitHub's raw content URL and injects them into the Claude API system prompt. No skill files are copied into this repo. Updates to the skills repo automatically reflect in the dashboard with no code changes or redeployment needed.

### Which skills power which feature

| API Route | Skills loaded | Purpose |
|-----------|--------------|---------|
| `/api/format.js` (Social Formatter) | social-content, platforms, post-templates, copywriting, copy-editing, marketing-psychology | Platform-specific formatting, hooks, copywriting quality |
| `/api/ideas.js` (Idea Generator) | marketing-ideas, ideas-by-category, content-strategy, social-content, platforms, marketing-psychology | Content ideation, strategy frameworks, platform knowledge |

### Prompt layering

The system prompt is built in two layers:
1. **Envision brand rules** (hardcoded, always present): brand voice, tone, accessibility language, platform format rules
2. **Marketing skills** (fetched from GitHub at runtime): expert frameworks, templates, and strategies

Envision-specific rules always take priority. When Envision-specific skills are added to the skills repo later, they will automatically be available with no changes needed here.

### Fallback behavior

If the GitHub fetch fails (network issue, repo unavailable), the AI features fall back to the hardcoded Envision brand rules alone. The features never break due to a skills repo outage.

### How to add new skills

1. Create a new skill directory in the `marketingskills` repo under `skills/your-skill-name/`
2. Add a `SKILL.md` file with the skill content
3. Add any reference files under `skills/your-skill-name/references/`
4. To wire it into this dashboard, add the file path to the `SKILL_SETS` object in `api/_skills.js`

Skills are cached in memory for 1 hour to avoid excessive GitHub API calls.

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
  _db.js          Shared Firebase Admin initializer
  intake.js       External form submission receiver
  send-reply.js   Email reply via Resend
  clickup.js      ClickUp API proxy
  format.js       AI Social Formatter (Anthropic)
  ideas.js        AI Content Idea Generator (Anthropic)
  analytics/
    _normalizer.js  Unified data normalizer (common schema)
    meta.js       Meta Graph API (Facebook + Instagram)
    tiktok.js     TikTok Display API
    linkedin.js   LinkedIn Marketing API
```
