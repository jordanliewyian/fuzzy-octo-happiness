import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/session'
import { submitPaperOrder } from '@/lib/paper-trading'

const schema = z.object({
  symbol: z.string().trim().toUpperCase().regex(/^[A-Z.]{1,8}$/),
  side: z.enum(['buy', 'sell']),
  qty: z.number().positive().finite(),
  orderType: z.enum(['market', 'limit', 'stop', 'stop_limit']).default('market'),
  timeInForce: z.enum(['day', 'gtc']).default('day'),
  limitPrice: z.number().positive().finite().optional(),
  stopPrice: z.number().positive().finite().optional(),
  clientOrderId: z.string().trim().min(1).max(64).optional(),
})

export async function POST(req: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = schema.parse(await req.json())
    const order = await submitPaperOrder({ ...body, userId: user.id })
    return NextResponse.json({ order }, { status: order.status === 'rejected' ? 422 : 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Order failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
