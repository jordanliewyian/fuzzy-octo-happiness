import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { cancelPaperOrder } from '@/lib/paper-trading'

export async function POST(_req: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { id } = await context.params
    return NextResponse.json({ order: await cancelPaperOrder(user.id, id) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel order'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
