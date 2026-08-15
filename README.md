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

This is intentionally paper-only. Before live money, add brokerage OAuth/linking, order reconciliation, idempotency, server-side risk limits, rate limiting, immutable audit logs, monitoring/rollback, and regulatory/compliance review.
