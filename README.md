# AgentLinkedIn

A full-stack AI assistant that turns technical RSS feeds and evergreen engineering concepts into review-ready LinkedIn posts — with a human always in the loop. Every account's data is fully isolated, and nothing is ever posted automatically: drafts are approved, scheduled, and then copy-pasted to LinkedIn by you.

Built solo by **Ahmad Ismail**.

> **Note on LinkedIn automation:** this project does **not** connect to the LinkedIn API and does **not** post, scrape, or automate anything on linkedin.com. It only drafts content with AI; publishing is a manual copy → paste → mark-as-posted step performed by the signed-in user. This keeps it clear of LinkedIn's automation/scraping restrictions.

## What it does

AgentLinkedIn watches ~20 trusted RSS/Atom feeds (official engineering blogs, GitHub releases, research feeds, and dedicated "learning" sources), scores and de-duplicates what it finds with a rule-based algorithm, and turns the best topics into structured research briefs and LinkedIn-ready drafts using Google Gemini. Every draft starts as `needs_review`: you approve, reject, edit inline, or regenerate it before anything gets scheduled. A daily cron job pre-runs discovery for every account so a fresh queue is often waiting when you open the app.

## Features

- **Multi-user accounts** — email/password sign-up and login, `scrypt`-hashed passwords, HMAC-signed session cookies, brute-force-throttled login. Every account's topics, drafts, schedule, and history are private and enforced at the database query level.
- **Feed-based topic discovery** — fetches ~20 RSS/Atom feeds in parallel, scores items with weighted keyword matching (no LLM call), filters duplicates and blocked topics, and reserves space for evergreen "learning" content so breaking news doesn't crowd it out.
- **Two content types** — time-sensitive **News** (source-grounded, expires after 21 days) and evergreen **Learning** posts (a 40-concept curated catalog plus learning-focused feeds, following a fixed problem → solution → rule-of-thumb teaching structure).
- **AI-assisted drafting** — Google Gemini turns a topic into a research brief, then a draft (hook, body, hashtags, angle) matching your tone/length/hashtag settings.
- **Review workflow** — approve, reject, inline-edit, or regenerate any draft; nothing is ever auto-published.
- **Scheduling + manual publish** — schedule an approved draft, then copy the formatted post, paste it into LinkedIn yourself, and mark it posted.
- **Quality gates** — every topic and brief is scored for source coverage, freshness, and duplicate risk, with a confidence level that gates whether a draft can even be generated.
- **In-app notifications** — a header bell surfaces "time to publish" alerts the moment a scheduled post is due.
- **Daily automation** — a Vercel Cron job runs a small discovery + brief batch for every account each morning, capped to stay within a free-tier AI quota.

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Styling / UI | Tailwind CSS 4, shadcn/ui, Radix primitives |
| Database | PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/) (schema + migrations) |
| AI | Google Gemini (`gemini-2.5-flash`, free tier) via `@google/genai` |
| Auth | Custom email/password auth — `scrypt` password hashing, HMAC-SHA256 signed session cookies (Web Crypto) |
| Feeds | RSS/Atom parsing via `fast-xml-parser` |
| Hosting | Vercel (app + Cron scheduler), [Neon](https://neon.tech/) Postgres |
| Validation | Zod |

## Architecture

The app is a modular monolith — one Next.js deployment, cleanly layered:

- `src/app` — routes and pages (App Router)
- `src/components` — reusable frontend UI
- `src/lib` — frontend-safe config and UI helpers
- `src/core` — shared domain models, schemas, and types
- `src/server/application` — backend use cases / services
- `src/server/repositories` — repository interfaces + Postgres implementations
- `src/server/discovery`, `src/server/content`, `src/server/quality`, `src/server/ai` — the discovery/scoring, draft-generation, quality-checking, and Gemini-client pipelines
- `src/server/db` — Drizzle client and schema
- `src/proxy.ts` — Next middleware that gates every route behind a signed session cookie

See [`docs/architecture.md`](docs/architecture.md) and [`docs/project-summary.md`](docs/project-summary.md) for the full technical write-up, including the account/isolation model and what is deliberately not built yet.

## Setup / installation

**Prerequisites:** Node.js 20+, a PostgreSQL database (local or [Neon](https://neon.tech/)), and a free [Google Gemini API key](https://ai.google.dev/).

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env.local
```

Fill in `.env.local`:

```bash
DATABASE_URL="postgres://user:password@localhost:5432/agentlinkedin"
GEMINI_API_KEY=""      # from ai.google.dev
CRON_SECRET=""         # any long random string — protects /api/cron/morning-run
AUTH_SECRET=""         # any long random string — signs session cookies
```

```bash
# 3. Run database migrations
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), sign up for an account, and go.

## Usage

1. **Sign up / log in** — each account's data is completely private.
2. **Discovery** — run a discovery pass (manually, or wait for the daily cron) to pull in fresh topics from the feed catalog.
3. **Briefs** — generate a research brief for a topic you like.
4. **Drafts** — generate a LinkedIn draft from an eligible brief, then approve, edit, reject, or regenerate it.
5. **Schedule** — schedule an approved draft for a future time.
6. **Publish** — when notified it's due, copy the post, paste it into LinkedIn, and mark it posted.

## How it works (agent flow)

```
RSS/Atom feeds
      │
      ▼
Discovery & scoring  (rule-based: weighted keywords, dedup, freshness — no AI call)
      │
      ▼
Research brief        (Gemini: source-grounded summary + quality/confidence check)
      │
      ▼
Draft generation      (Gemini: hook, body, hashtags, angle — per your tone/style settings)
      │
      ▼
Human review           (approve / reject / edit / regenerate — nothing skips this step)
      │
      ▼
Schedule → manual publish → marked posted
```

A daily Vercel Cron job (`/api/cron/morning-run`) repeats the discovery → brief steps for every account each morning, within a small per-user AI budget, so there's usually something ready to review without lifting a finger.

## What's not built yet

- Real LinkedIn API publishing (intentional — publishing stays a manual, human-approved step)
- Per-user source/feed preferences (the feed catalog is currently shared across all accounts)
- Engagement analytics (schema exists; nothing populates it without a LinkedIn API connection)
