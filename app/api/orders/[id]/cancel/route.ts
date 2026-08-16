import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getUser } from '@/lib/session'
import { cancelPaperOrder } from '@/lib/paper-trading'
import { serverError } from '@/lib/api-error'

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await context.params
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
    }
    return NextResponse.json({ order: await cancelPaperOrder(user.id, id) })
  } catch (error) {
    return serverError(error, 'orders/cancel')
  }
}
