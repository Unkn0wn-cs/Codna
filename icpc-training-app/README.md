# ICPC Club — Training System

A club website with real accounts, scoring, a leaderboard, and guided coaching.
Static front-end in `public/`, backend in `netlify/functions/` (Netlify Functions),
data stored in **Netlify Blobs** (no separate database to sign up for).

## What's real here

- **Accounts**: bcrypt-hashed passwords, real signup/login, never sent to the client.
- **Sessions**: signed JWT in an httpOnly, secure cookie — not readable by JS, not
  stored in browser storage.
- **Scoring**: points are computed server-side from a fixed difficulty → points map.
  The server ignores any point value sent from the browser, so a member can't
  edit the page and award themselves points.
- **Leaderboard**: a shared aggregate, recomputed on every logged solve.
- **Coaching**: accounts can be marked `isCoach` at signup; only those accounts can
  look up another member and post notes / assign tasks to them (enforced server-side,
  not just hidden in the UI).

## Project layout

```
netlify.toml              # build + security headers
package.json
public/
  index.html               # the whole site (static HTML/CSS/JS, no build step)
netlify/
  functions/
    _lib/
      auth.js               # JWT + cookie helpers
      store.js               # Netlify Blobs access, scoring, validation
    signup.js
    login.js
    logout.js
    session.js               # GET — restores a logged-in session on page load
    log-solve.js
    delete-submission.js
    toggle-task.js
    add-task.js
    leaderboard.js            # GET — public
    coach-lookup.js           # GET — coach-only
    coach-note.js             # coach-only
    coach-assign-task.js      # coach-only
```

## 1. Install dependencies

```bash
npm install
```

## 2. Set your JWT secret

Sessions are signed with `JWT_SECRET`. Generate one and put it in a local `.env`
file (gitignored) for `netlify dev`, and in the Netlify dashboard for production:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Create `.env` in the project root:

```
JWT_SECRET=paste-the-generated-value-here
```

Without this set, the app falls back to an insecure default and prints a warning —
fine for a first local test, **not** fine for a real deploy.

## 3. Run it locally

```bash
npx netlify-cli dev
```

This serves `public/` and the functions together on one local URL (usually
`http://localhost:8888`), with Netlify Blobs emulated locally — so signup, login,
scoring, and the leaderboard all work exactly like production before you deploy.

Open it, create an account, log a few solves, check the leaderboard. Create a
second account with "register as coach" checked to try the coach console.

## 4. Deploy to Netlify

**Option A — connect a Git repo (recommended):**
1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In the Netlify dashboard: **Add new site → Import an existing project**, pick
   the repo. Build command and publish directory are already set in `netlify.toml`,
   so you can leave the defaults.
3. **Site settings → Environment variables** → add `JWT_SECRET` with the value you
   generated above.
4. Deploy. Every push to your main branch redeploys automatically.

**Option B — deploy straight from your machine:**
```bash
npx netlify-cli login
npx netlify-cli init      # links this folder to a new or existing Netlify site
npx netlify-cli env:set JWT_SECRET "paste-the-generated-value-here"
npx netlify-cli deploy --prod
```

Netlify Blobs requires no setup beyond this — it's provisioned automatically per
site the first time a function writes to it.

## Known limitations / good next steps

- **No password reset.** Add an email-based reset flow if you want one (needs an
  email-sending provider — Netlify doesn't include one).
- **No email verification at signup.** Anyone can register with any username that
  isn't taken.
- **No rate limiting** on login/signup — fine for a small club, worth adding
  (e.g. via Netlify's edge functions or a small in-memory/IP-based limiter) if the
  site gets wider exposure.
- **Blobs is last-write-wins.** Extremely unlikely to matter at club scale, but two
  people editing the exact same record in the same instant could clobber each
  other. A real relational database (Neon, Supabase, etc.) would remove this if it
  ever becomes a concern.
- **Content Security Policy** in `netlify.toml` currently allows `'unsafe-inline'`
  for scripts/styles since everything lives in one HTML file. If you split the JS
  into an external file, tighten this to drop `'unsafe-inline'` on `script-src`.
