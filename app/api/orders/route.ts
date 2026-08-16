import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { getPaperOrders } from '@/lib/paper-trading'
import { serverError } from '@/lib/api-error'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return NextResponse.json({ orders: await getPaperOrders(user.id) })
  } catch (error) {
    return serverError(error, 'orders')
  }
}
