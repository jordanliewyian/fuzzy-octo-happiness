import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/session'
import { getPaperQuote } from '@/lib/paper-market'

export async function GET(req: Request) {
  if (!await getUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const raw = new URL(req.url).searchParams.get('symbol') || ''
  try {
    const symbol = z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/).parse(raw)
    const quote = await getPaperQuote(symbol)
    if (!quote) return NextResponse.json({ error: `Unsupported paper symbol: ${symbol}` }, { status: 404 })
    return NextResponse.json(quote)
  } catch {
    return NextResponse.json({ error: 'Invalid symbol' }, { status: 400 })
  }
}
