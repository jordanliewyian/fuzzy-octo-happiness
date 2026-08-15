import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { advancePaperMarket } from '@/lib/paper-market'
import { advancePaperOrders } from '@/lib/paper-trading'

export async function POST() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const quotes = await advancePaperMarket()
    const orders = await advancePaperOrders()
    return NextResponse.json({ quotes, orders })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to advance paper market'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
