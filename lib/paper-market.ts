import { sql } from './db'

export const PAPER_SYMBOLS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'META', 'TSLA', 'SPY', 'QQQ', 'BRK.B'] as const

export type PaperQuote = {
  symbol: string
  price: number
  previousPrice: number
  change: number
  changePercent: number
  updatedAt: string
}

function randomWalk(price: number, maxMoveBps = 75) {
  const moveBps = (Math.random() * 2 - 1) * maxMoveBps
  return Math.max(0.01, price * (1 + moveBps / 10_000))
}

export async function listPaperQuotes(): Promise<PaperQuote[]> {
  const rows = await sql`
    select symbol, price, previous_price, updated_at
    from paper_market_quotes
    where symbol = any(${PAPER_SYMBOLS})
    order by array_position(${PAPER_SYMBOLS}, symbol)
  `
  return rows.map(toQuote)
}

export async function getPaperQuote(symbol: string): Promise<PaperQuote | null> {
  const rows = await sql`
    select symbol, price, previous_price, updated_at
    from paper_market_quotes
    where symbol = ${symbol}
  `
  return rows[0] ? toQuote(rows[0]) : null
}

export async function advancePaperMarket() {
  const rows = await sql`
    select symbol, price
    from paper_market_quotes
    where symbol = any(${PAPER_SYMBOLS})
    order by symbol
  `
  const next = rows.map((row) => ({ symbol: row.symbol as string, price: randomWalk(Number(row.price)) }))

  for (const quote of next) {
    await sql`
      update paper_market_quotes
      set previous_price = price,
          price = ${quote.price},
          updated_at = now()
      where symbol = ${quote.symbol}
    `
  }

  return listPaperQuotes()
}

function toQuote(row: Record<string, any>): PaperQuote {
  const price = Number(row.price)
  const previousPrice = Number(row.previous_price)
  const change = price - previousPrice
  const changePercent = previousPrice === 0 ? 0 : (change / previousPrice) * 100
  return {
    symbol: String(row.symbol),
    price,
    previousPrice,
    change,
    changePercent,
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}
