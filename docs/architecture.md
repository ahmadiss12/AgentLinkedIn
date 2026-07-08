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

## Database

The production database target is PostgreSQL through Drizzle ORM. The database client is lazy-initialized so builds do not require `DATABASE_URL`.

Local development can run without a database for now. When `DATABASE_URL` is missing, backend repositories return seed data so the dashboard remains usable until migrations are applied.
