# cvr.connect

A Hinge-style matching app exclusively for CVR College students.

**Stack:** React 19 · Tailwind v4 · Express · Clerk · Neon (PostgreSQL)

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

Fill in the three required values:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → create free project → Connection string |
| `VITE_CLERK_PUBLISHABLE_KEY` | [clerk.com](https://clerk.com) → create app → API Keys |
| `CLERK_SECRET_KEY` | Same Clerk dashboard |
| `ADMIN_TOKEN` | Any strong random string (`openssl rand -hex 32`) |

### 3. Run locally
```bash
npm run dev
```

App runs at `http://localhost:3000`.

---

## How it works

### Auth
Clerk handles all signup/login. After a user signs in for the first time, they're taken through a profile setup flow (basics → photo → prompt). Their profile stays in `pending` status until an admin approves it.

### Admin
Go to **Profile → Admin panel** (only visible to admin users). Enter your `ADMIN_TOKEN` to access user moderation. Approve, reject, or ban users. Approved users can start discovering people.

### Matching
- Users can send up to **8 likes per day**
- A like can be sent on a photo or a specific prompt answer, with an optional comment
- If both users like each other, a match is created automatically
- Matches get a private chat

---

## Deploy to Vercel

```bash
npm run build
vercel deploy
```

Set the same `.env` values in Vercel's environment variables dashboard.
