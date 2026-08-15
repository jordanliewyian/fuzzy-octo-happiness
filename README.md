# Robinhood Clone — self-hosted paper trading

A Robinhood-style paper-trading application backed by Neon Postgres. The current trading path is fully simulated by the application; no brokerage account is required.

## Stack

- Next.js App Router: UI + server API routes
- Neon Postgres: users, sessions, paper accounts, positions, orders, fills, quotes
- Vercel: hosting
- Optional Finnhub development market-data feed

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
- An explicit market-advance operation that reprices the shared symbol universe and evaluates open orders

The preset symbol universe is AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, SPY, QQQ, and BRK.B.

## Market data

The simulator stores the latest price for each symbol in Postgres. When `FINNHUB_API_KEY` is configured, **Advance market** refreshes prices from Finnhub's US stock quote endpoint; when the provider is unavailable, it falls back to the local randomized walk.

Finnhub's current free plan allows 60 API calls/minute and provides US market data, but its license is for personal use. It is suitable for development/testing, not as the commercial market-data license for a public trading product. See the Finnhub pricing terms before using it for anything beyond personal development.

## Database migrations

Schema changes are versioned under `db/migrations/` and tracked in `schema_migrations`. Apply the production migration from the protected GitHub Actions workflow before testing a new deployment.

## Production secrets

- `DATABASE_URL` — Neon Postgres connection string
- `PAPER_STARTING_CASH` — optional, defaults to `100000`
- `FINNHUB_API_KEY` — optional development-only market-data key

Do not commit credentials or production connection strings.

## Trading safety

The paper engine is intentionally isolated from live brokerage APIs. Before real-money trading, add broker adapters, reconciliation, idempotency, risk limits, audit logging, monitoring, and regulatory/compliance review.
