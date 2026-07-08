import "server-only";

import type { TopicCategory } from "@/core/content-models";

export type LearningConcept = {
  title: string;
  slug: string;
  summary: string;
  category: TopicCategory;
};

// Evergreen engineering concepts worth explaining on LinkedIn. Each becomes
// a "learning" topic: the brief is written from general engineering
// knowledge (no news feeds involved) and the draft uses the educational
// problem/solution/rule-of-thumb style.
export const learningConceptCatalog: LearningConcept[] = [
  {
    title: "Caching with Redis, explained simply",
    slug: "learning-redis-caching",
    summary:
      "Why apps hit the database for data that barely changes, how an in-memory cache like Redis sits in front of the database (cache hit vs cache miss), and why TTL expiration matters.",
    category: "software_engineering",
  },
  {
    title: "Pagination: offset vs cursor",
    slug: "learning-pagination-offset-cursor",
    summary:
      "Why sending huge lists in one response fails, how offset pagination (page/limit) works and where it breaks, and why cursor pagination powers infinite scroll feeds.",
    category: "software_engineering",
  },
  {
    title: "Database indexes: why your queries are slow",
    slug: "learning-database-indexes",
    summary:
      "How a full table scan differs from an index lookup, what a B-tree index actually does, why indexes speed up reads but slow down writes, and how to spot missing indexes.",
    category: "data_engineering",
  },
  {
    title: "The N+1 query problem",
    slug: "learning-n-plus-one-queries",
    summary:
      "How ORMs silently fire one query per row in a loop, why it destroys performance at scale, and how eager loading / joins / batching fix it.",
    category: "software_engineering",
  },
  {
    title: "Rate limiting: protecting your API",
    slug: "learning-rate-limiting",
    summary:
      "Why APIs need request limits, the main algorithms (fixed window, sliding window, token bucket), and what good 429 responses look like.",
    category: "software_engineering",
  },
  {
    title: "Idempotency: safe retries",
    slug: "learning-idempotency",
    summary:
      "Why retrying a failed payment request can charge someone twice, what makes an operation idempotent, and how idempotency keys make retries safe.",
    category: "software_engineering",
  },
  {
    title: "Message queues: why systems talk asynchronously",
    slug: "learning-message-queues",
    summary:
      "Why doing everything in the request path fails, how queues (RabbitMQ, SQS, Kafka) decouple producers from consumers, and when async processing is the right call.",
    category: "software_engineering",
  },
  {
    title: "Load balancing basics",
    slug: "learning-load-balancing",
    summary:
      "How traffic gets spread across servers, round-robin vs least-connections vs IP-hash strategies, health checks, and why sticky sessions are a smell.",
    category: "cloud_computing",
  },
  {
    title: "The CAP theorem in plain words",
    slug: "learning-cap-theorem",
    summary:
      "Consistency, availability, partition tolerance — why you can only fully have two when the network splits, and what real databases actually choose.",
    category: "computer_science",
  },
  {
    title: "ACID transactions, explained",
    slug: "learning-acid-transactions",
    summary:
      "What atomicity, consistency, isolation, and durability each guarantee, and what actually goes wrong in your data when they're missing.",
    category: "data_engineering",
  },
  {
    title: "Database sharding: splitting data across machines",
    slug: "learning-database-sharding",
    summary:
      "What happens when one database machine isn't enough, how horizontal sharding by key works, and the painful parts: cross-shard queries and resharding.",
    category: "data_engineering",
  },
  {
    title: "Webhooks vs polling",
    slug: "learning-webhooks-vs-polling",
    summary:
      "Two ways to learn about events in another system: asking repeatedly (polling) vs being called back (webhooks) — trade-offs in freshness, cost, and reliability.",
    category: "software_engineering",
  },
  {
    title: "JWT vs session cookies",
    slug: "learning-jwt-vs-sessions",
    summary:
      "How server-side sessions and stateless JWTs each keep users logged in, where each stores state, and why JWT revocation is the hard part.",
    category: "cybersecurity",
  },
  {
    title: "OAuth 2.0 without the jargon",
    slug: "learning-oauth-basics",
    summary:
      "What problem 'Log in with Google' actually solves, the roles (client, resource owner, authorization server), and what the authorization code flow does step by step.",
    category: "cybersecurity",
  },
  {
    title: "Hashing vs encryption",
    slug: "learning-hashing-vs-encryption",
    summary:
      "One is one-way (password storage, integrity checks), the other is reversible with a key (data in transit) — why mixing them up causes security bugs.",
    category: "cybersecurity",
  },
  {
    title: "How HTTPS/TLS actually works",
    slug: "learning-tls-handshake",
    summary:
      "What happens in the TLS handshake, why certificates and certificate authorities exist, and what 'the padlock' does and does not guarantee.",
    category: "cybersecurity",
  },
  {
    title: "DNS: the internet's phone book",
    slug: "learning-dns-basics",
    summary:
      "How a domain name becomes an IP address, the chain of resolvers and authoritative servers, TTL caching, and why DNS changes 'take time to propagate'.",
    category: "computer_science",
  },
  {
    title: "CDNs: why your static files should live at the edge",
    slug: "learning-cdn-basics",
    summary:
      "How content delivery networks cache files close to users, what cache invalidation looks like, and why images/JS/CSS should rarely be served from your own server.",
    category: "cloud_computing",
  },
  {
    title: "Docker images and layers, demystified",
    slug: "learning-docker-layers",
    summary:
      "What an image layer is, why layer order in a Dockerfile decides build speed, and how caching makes or breaks your CI times.",
    category: "developer_tools",
  },
  {
    title: "CI/CD pipelines: what actually runs when you push",
    slug: "learning-ci-cd-basics",
    summary:
      "The stages of a healthy pipeline (build, test, deploy), why fast feedback matters more than fancy tooling, and what separates CI from CD.",
    category: "developer_tools",
  },
  {
    title: "Feature flags: shipping without releasing",
    slug: "learning-feature-flags",
    summary:
      "How flags decouple deployment from release, enable gradual rollouts and kill switches, and why flag cleanup debt is real.",
    category: "software_engineering",
  },
  {
    title: "Blue-green and canary deployments",
    slug: "learning-blue-green-canary",
    summary:
      "Two ways to deploy without downtime: switching traffic between two identical environments vs slowly shifting a small percentage to the new version.",
    category: "cloud_computing",
  },
  {
    title: "Observability: logs vs metrics vs traces",
    slug: "learning-observability-pillars",
    summary:
      "What each pillar answers (what happened, how much/how fast, where time went across services), and why you need all three once you have more than one service.",
    category: "software_engineering",
  },
  {
    title: "Retries with exponential backoff",
    slug: "learning-retries-backoff",
    summary:
      "Why naive retries make outages worse, how exponential backoff with jitter spreads the load, and which errors deserve retries at all.",
    category: "software_engineering",
  },
  {
    title: "Circuit breakers: failing fast on purpose",
    slug: "learning-circuit-breakers",
    summary:
      "How the circuit breaker pattern stops cascading failures — closed/open/half-open states — and when to prefer it over retries.",
    category: "software_engineering",
  },
  {
    title: "Event-driven architecture in plain words",
    slug: "learning-event-driven-architecture",
    summary:
      "Systems reacting to events instead of calling each other directly: benefits (decoupling, scalability) and costs (eventual consistency, harder debugging).",
    category: "software_engineering",
  },
  {
    title: "REST vs GraphQL vs gRPC",
    slug: "learning-rest-graphql-grpc",
    summary:
      "Three ways services expose APIs: resource-based REST, client-driven GraphQL queries, and contract-first binary gRPC — and when each fits.",
    category: "software_engineering",
  },
  {
    title: "WebSockets: when HTTP isn't enough",
    slug: "learning-websockets",
    summary:
      "Why request/response can't push updates to the browser, how a WebSocket connection stays open both ways, and alternatives like SSE and polling.",
    category: "software_engineering",
  },
  {
    title: "Optimistic vs pessimistic locking",
    slug: "learning-optimistic-pessimistic-locking",
    summary:
      "Two strategies when users edit the same data: lock it first vs detect conflicts at save time with version numbers — and where each shines.",
    category: "data_engineering",
  },
  {
    title: "Eventual consistency, explained calmly",
    slug: "learning-eventual-consistency",
    summary:
      "Why distributed systems can't always show the newest data instantly, what 'eventually consistent' promises, and UX patterns that hide the lag.",
    category: "computer_science",
  },
  {
    title: "SQL vs NoSQL: picking a database",
    slug: "learning-sql-vs-nosql",
    summary:
      "Relational tables with joins and constraints vs document/key-value stores built for flexible schemas and horizontal scale — the honest trade-offs.",
    category: "data_engineering",
  },
  {
    title: "Connection pooling: the database bottleneck nobody sees",
    slug: "learning-connection-pooling",
    summary:
      "Why opening a database connection per request kills performance, how pools reuse connections, and what pool exhaustion looks like in production.",
    category: "data_engineering",
  },
  {
    title: "Database migrations without downtime",
    slug: "learning-zero-downtime-migrations",
    summary:
      "Why 'just rename the column' breaks running apps, and the expand-migrate-contract pattern that lets schema and code change safely in steps.",
    category: "data_engineering",
  },
  {
    title: "API versioning strategies",
    slug: "learning-api-versioning",
    summary:
      "URL versions vs headers vs additive-only changes: how to evolve an API without breaking every client that depends on it.",
    category: "software_engineering",
  },
  {
    title: "Secrets management: getting keys out of your code",
    slug: "learning-secrets-management",
    summary:
      "Why credentials in code or plain env files leak, how secret stores and rotation work, and the least-privilege habit that limits blast radius.",
    category: "cybersecurity",
  },
  {
    title: "Semantic versioning: what 2.1.3 actually promises",
    slug: "learning-semver",
    summary:
      "Major.minor.patch as a contract with your users: what each number signals, and why breaking changes hiding in minor releases destroy trust.",
    category: "open_source",
  },
  {
    title: "Monorepos vs many repos",
    slug: "learning-monorepo-vs-polyrepo",
    summary:
      "One big repository with shared tooling vs many small ones with clear ownership — what actually changes for teams: refactoring, CI, and dependencies.",
    category: "developer_tools",
  },
  {
    title: "What a reverse proxy actually does",
    slug: "learning-reverse-proxy",
    summary:
      "Nginx and friends sitting in front of your app: TLS termination, compression, routing, buffering — and why almost every production stack has one.",
    category: "cloud_computing",
  },
  {
    title: "Big-O notation for working engineers",
    slug: "learning-big-o-practical",
    summary:
      "What O(1), O(log n), O(n), O(n²) mean in practice, why constants matter less than growth, and how to spot accidental quadratic loops in code review.",
    category: "computer_science",
  },
  {
    title: "Race conditions: bugs that only happen sometimes",
    slug: "learning-race-conditions",
    summary:
      "Why two things reading and writing shared state without coordination corrupt data, classic examples (double-spend, lost update), and the standard fixes.",
    category: "computer_science",
  },
];
