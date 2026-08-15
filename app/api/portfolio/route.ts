import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { getPaperAccount } from '@/lib/paper-trading'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const account = await getPaperAccount(user.id)
    return NextResponse.json({ account })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load paper account'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
