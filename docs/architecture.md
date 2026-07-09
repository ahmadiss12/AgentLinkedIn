# Architecture

AgentLinkedIn is organized as a modular monolith so the frontend and backend stay separate while still shipping as one Next.js app.

## Layers

- `src/app`: Next.js routes and server-rendered pages.
- `src/components`: reusable frontend UI components.
- `src/lib`: frontend-safe configuration and UI helpers.
- `src/core`: shared domain models, validation schemas, and types. This is the TypeScript equivalent of a class library.
- `src/server/application`: backend use cases and services.
- `src/server/repositories`: backend repository interfaces and implementations.
- `src/server/db`: database client and Drizzle schema.

Frontend code should depend on `src/core` types and backend service functions only from Server Components or server actions. Browser Client Components should not import from `src/server`.

## Authentication

`src/proxy.ts` (Next middleware) gates every route behind a signed session cookie (`src/lib/session.ts`, HMAC-signed with `AUTH_SECRET`). Server Components and route handlers read the current user via `src/server/auth/current-user.ts`. Every repository method that touches user data takes an explicit `userId` and filters by it — there is no ambient "current user" at the data layer, so it's impossible to accidentally leak one account's rows into another's query. See `docs/project-summary.md` for the full account model.

## Database

The production database target is PostgreSQL through Drizzle ORM. The database client is lazy-initialized so builds do not require `DATABASE_URL`.

Local development can run without a database for now. When `DATABASE_URL` is missing, backend repositories return seed data so the dashboard remains usable until migrations are applied.
