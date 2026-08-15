import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { listPaperQuotes } from '@/lib/paper-market'

export async function GET() {
  if (!await getUser()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ quotes: await listPaperQuotes() })
}
