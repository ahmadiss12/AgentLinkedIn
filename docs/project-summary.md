# AgentLinkedIn — Project Summary

What this app is, how each part works, and what was actually built — kept accurate to the real code, not a marketing description.

## 1. What this is

A personal AI assistant that turns technical developments and evergreen engineering concepts into LinkedIn posts, with a human always in the loop: nothing is ever posted without explicit approval, and (as of this version) every account's data is completely private to that account.

Stack: Next.js 16 (App Router, Turbopack) + React 19 + TypeScript, Tailwind 4 + shadcn/ui, Drizzle ORM + PostgreSQL, Google Gemini (`gemini-2.5-flash`, free tier) for AI generation.

## 2. Accounts and authentication (multi-user)

Every page and API route requires a signed-in account — there is no "open" mode anymore, locally or deployed.

**How sign-in works:**
- `/signup` — email, name, password (min 8 chars). Passwords are hashed with Node's built-in `scrypt` (salt + hash, `timingSafeEqual` comparison) — never stored in plain text, no third-party auth service.
- `/login` — email + password. Wrong attempts are throttled (~1s delay) to blunt brute-forcing.
- A successful login/signup sets a signed, `HttpOnly`, 30-day session cookie. The token is `userId.expiresAt.signature`, HMAC-SHA256 signed with the `AUTH_SECRET` environment variable (Web Crypto, so it works identically in the Edge-runtime proxy and in Node route handlers).
- `src/proxy.ts` (Next's middleware) checks that cookie on every request. No valid session → pages redirect to `/login`, API routes return `401`.
- The cron endpoint (`/api/cron/morning-run`) is separate: it's not a user session at all, it's authorized by a `CRON_SECRET` bearer token that only Vercel's scheduler (or you, manually) has.

**What's private per account vs. shared globally** (a deliberate simplification, not an oversight):
- **Private per user**: topics, briefs, drafts, review history, schedule, published posts, notifications, preferences/settings. A user can never see, approve, schedule, or otherwise act on another user's data — this is enforced at the database query level (every query filters by `userId`), not just hidden in the UI. Verified directly: user B given user A's real draft ID gets a generic "not found," not a status-revealing error.
- **Shared/global**: the source catalog (which RSS feeds exist) and each feed's enabled/disabled toggle. Everyone monitors the same list of blogs — like a shared admin setting — but what topics each person's discovery run *finds and keeps* from those feeds is entirely their own.

**Claiming a pre-accounts workspace**: this app existed and had real local data before accounts did. Rather than losing that data, signing up with the exact email of a pre-existing "legacy" account (one with no password set) claims it and inherits everything under it. Migrated automatically and verified: 110 existing topics and their entire history stayed intact and attached to the first real account.

## 3. Content pipeline

**Discovery** (`src/server/discovery/`): fetches ~20 trusted RSS/Atom feeds in parallel (official blogs, GitHub releases, research feeds, and dedicated "learning" feeds like Julia Evans / Martin Fowler / ByteByteGo / freeCodeCamp), scores each item for relevance/novelty/category, filters duplicates and topics you've blocked in Settings, and reserves at least half the results for "learning" (evergreen) content so fresh news can't crowd it out entirely.

**Two content types**:
- **News** — time-sensitive developments from feeds; briefs are strictly source-grounded (every claim must trace back to a real article) and go stale after 21 days.
- **Learning** — evergreen engineering concepts (caching, pagination, race conditions, …), either from a 40-concept curated catalog or from the learning feeds above. Briefs use general engineering knowledge (or the source article, if one exists) and never expire. Drafts for these follow a fixed teaching structure: **The problem → The solution (with → step arrows) → Rule of thumb**. Learning topics are prioritized ahead of news in every queue.

**Briefs → Drafts → Review**: Gemini turns a topic into a structured research brief, then into a LinkedIn draft (hook, body, hashtags, angle) matching your Settings (tone, length, hashtag density, focus). Every draft starts as `needs_review` and can be approved, rejected, edited inline, or regenerated with a different angle — never auto-published.

**Schedule → manual publish**: an approved draft can be scheduled for a future time. Since there's no LinkedIn API connection yet, "publishing" is: copy the formatted post, open LinkedIn, paste it yourself, then mark it posted in the app so the record stays accurate.

## 4. Quality controls

Every discovered topic gets scored on source coverage, freshness, and duplicate risk; briefs get flagged for weak sourcing or speculation and given a confidence level (low/medium/high) that gates whether a draft can even be generated from them. All of this is visible on the dashboard and the Analytics page (real-time counts, not estimates).

## 5. Notifications

An in-app bell (polls every 60s) creates a "time to publish" notification the moment a scheduled post's time arrives — deduplicated so it only ever fires once per post, generated lazily on read (no background worker needed).

## 6. Automation (Vercel Cron)

`/api/cron/morning-run`, scheduled daily at 06:00 UTC, loops over every registered account and runs a small discovery + brief batch for each — so a fresh, review-ready queue is often waiting before you open the app, without spending your whole daily Gemini quota (capped at 2 briefs per user per run).

## 7. Database (PostgreSQL via Drizzle ORM)

16 tables. The core content chain: `users → topics → drafts → draft_versions / review_events / scheduled_posts → published_posts`, plus `sources → source_items → topic_sources` (the shared feed catalog and what it fed into each topic), `quality_checks`, `preferences`, `notifications`, and `agent_runs` (a full audit log of every discovery/brief/draft run, per user). Every migration is a real, reviewed SQL file in `drizzle/`, applied to both the local dev database and the hosted Neon database — never hand-edited on either.

## 8. Deployment

Hosted on Vercel (app + cron scheduler) with a Neon Postgres database. `DATABASE_URL`, `GEMINI_API_KEY`, `AUTH_SECRET`, and `CRON_SECRET` are the required environment variables — `AUTH_SECRET` in particular must be identical across restarts (it signs every session) but does not need to match between local and deployed, since those are separate login systems with separate accounts.

## 9. What's genuinely not built yet

- **Real LinkedIn API publishing** — parked on purpose; requires you to register a LinkedIn developer app. The manual copy/paste flow is the deliberate stand-in.
- **Per-user source preferences** — the feed list and its enabled/disabled state is shared across all accounts (see §2). Making that per-user is a small, well-scoped follow-up if it's ever needed.
- **Engagement analytics** (likes/comments/impressions) — the schema has columns for it, but nothing writes real numbers yet since there's no LinkedIn API connection to pull them from.
