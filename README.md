# Robinhood Clone — real backend, paper trading

A Robinhood-style trading application backed by Neon Postgres and Alpaca paper trading.

## Stack

- Next.js App Router: UI + server API routes
- Neon Postgres: users, sessions, orders, positions
- Alpaca: paper account, order routing and market quotes
- Vercel: hosting

## Setup

1. In Vercel, add the Neon integration and create a database.
2. Run `schema.sql` against the resulting Postgres database.
3. Create an Alpaca paper account and add its API key/secret.
4. Configure the environment variables in `.env.example`.
5. Deploy.

## Build verification

The repository defines `npm run typecheck` and `npm run build`, and GitHub Actions runs both on pull requests and pushes to `main` / `agent/*`.

The TypeScript config explicitly maps `@/*` to the repository root so imports such as `@/lib/session` resolve consistently in local, CI, and Vercel builds.

## Vercel troubleshooting

For a failed Vercel preview, open the deployment's Build Logs and copy the first `Module not found`, TypeScript, or build error. The Vercel GitHub integration posts the deployment URL back to the pull request.

In this development session, the connected Vercel API can see the team but does not currently have permission to inspect this GitHub-linked project/deployment, so raw build logs are not available through the connector. Re-authorizing the Vercel connection for the team/project should allow future agents to call Vercel's deployment and build-log APIs directly.

This is intentionally paper-only. Before live money, add brokerage OAuth/linking, order reconciliation, idempotency, server-side risk limits, rate limiting, immutable audit logs, monitoring/rollback, and regulatory/compliance review.
