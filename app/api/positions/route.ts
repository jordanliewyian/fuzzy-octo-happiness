import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { getPaperPositions } from '@/lib/paper-trading'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    return NextResponse.json({ positions: await getPaperPositions(user.id) })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load paper positions'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
