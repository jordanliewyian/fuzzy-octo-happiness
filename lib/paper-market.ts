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

async function fetchFinnhubPrice(symbol: string) {
  const apiKey = process.env.FINNHUB_API_KEY
  if (!apiKey) return null

  const url = new URL('https://finnhub.io/api/v1/quote')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('token', apiKey)
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`Market data provider returned ${response.status}`)
  const body = await response.json() as { c?: number; pc?: number }
  if (!Number.isFinite(body.c) || Number(body.c) <= 0) return null
  return Number(body.c)
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

  const useFinnhub = Boolean(process.env.FINNHUB_API_KEY)
  const next = [] as Array<{ symbol: string; price: number }>
  for (const row of rows) {
    let price: number | null = null
    if (useFinnhub) {
      try {
        price = await fetchFinnhubPrice(String(row.symbol))
      } catch {
        // Fall back to the local random walk when the free provider is unavailable.
      }
    }
    next.push({ symbol: String(row.symbol), price: price ?? randomWalk(Number(row.price)) })
  }

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
