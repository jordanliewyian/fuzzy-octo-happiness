# Robinhood Clone — real backend, paper trading

A Robinhood-style trading application backed by Neon Postgres and Alpaca paper trading.

## Stack

- Next.js App Router: UI + server API routes
- Neon Postgres: users, sessions, orders, positions, watchlists
- Alpaca: paper account, order routing and market quotes
- Vercel: hosting

## Setup

1. In Vercel, connect the Neon integration and configure the database connection for the project.
2. Configure `DATABASE_URL` in Vercel. The application also accepts `POSTGRES_URL` and `POSTGRES_PRISMA_URL` as fallbacks.
3. Create an Alpaca paper account and add its API key/secret.
4. Deploy.

## Database migrations

Database schema changes are versioned under `db/migrations/` and tracked in the `schema_migrations` table. Never edit an already-applied migration; add a new numbered migration instead.

### Apply locally or from a secure admin machine

Set a connection string in your shell without committing it:

```bash
export DATABASE_URL='postgresql://...'
npm install
npm run db:migrate
```

To check whether the database has pending migrations without applying them:

```bash
npm run db:migrate:check
```

The runner takes a PostgreSQL advisory lock so two migration jobs cannot run concurrently. Each migration runs in a transaction and is recorded only after it succeeds.

### Apply to production with GitHub Actions

The repository includes `.github/workflows/migrate.yml`, which is intentionally manual rather than running on every deploy.

1. In GitHub, open **Settings → Environments** and create an environment named `production-db`.
2. Add an environment secret named `DATABASE_URL` containing the current Neon connection string.
3. Optionally configure required reviewers on `production-db` so migrations require approval.
4. In **Actions → Database migrations**, choose **Run workflow** on `agent/robinhood-mvp` (or the branch containing the migration), then approve the environment when prompted.
5. The workflow runs `npm run db:migrate` and applies only migrations that are not already recorded in `schema_migrations`.

Do not put database credentials in source files, `.env` files committed to Git, or pull requests.

## Build verification

The repository defines `npm run typecheck` and `npm run build`, and GitHub Actions runs both on pull requests and pushes to `main` / `agent/*`.

## Database health

`GET /api/health/db` verifies that the application can reach Postgres and returns only a sanitized status; credentials are never returned.

## Vercel troubleshooting

For a failed Vercel preview, open the deployment's Build Logs and copy the first `Module not found`, TypeScript, or build error. The Vercel GitHub integration posts the deployment URL back to the pull request.

## Trading safety

This is intentionally paper-only. Before live money, add brokerage OAuth/linking, order reconciliation, idempotency, server-side risk limits, rate limiting, immutable audit logs, monitoring/rollback, and regulatory/compliance review.
