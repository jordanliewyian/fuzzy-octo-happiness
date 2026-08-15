# Robinhood Clone — self-hosted paper trading

A Robinhood-style paper-trading application backed by Neon Postgres. The current trading path is fully simulated by the application; no brokerage account is required.

## Stack

- Next.js App Router: UI + server API routes
- Neon Postgres: users, sessions, paper accounts, positions, orders, fills, quotes
- Vercel: hosting

## Paper trading

Every application user gets a persistent $100,000 paper account on first use. The simulator currently supports:

- Market orders
- Limit orders
- Stop orders
- Stop-limit orders
- Day and GTC time-in-force values
- Fractional quantities
- Order cancellation
- Fill records
- Cash and position accounting
- Randomized execution slippage
- A persistent mocked market with an explicit "advance market" operation

The mocked symbol universe is AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, SPY, QQQ, and BRK.B.

## Database migrations

Schema changes are versioned under `db/migrations/` and tracked in `schema_migrations`. Apply the production migration from the protected GitHub Actions workflow before testing a new deployment.

## Production secrets

`DATABASE_URL` remains the only required external service connection for the paper-trading MVP. `PAPER_STARTING_CASH` is optional and defaults to `100000`.

Do not commit credentials or production connection strings.

## Trading safety

The paper engine is intentionally isolated from live brokerage APIs. Before real-money trading, add broker adapters, reconciliation, idempotency, risk limits, audit logging, monitoring, and regulatory/compliance review.
