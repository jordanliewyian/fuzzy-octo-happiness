import { NextResponse } from 'next/server'
import { getUser } from '@/lib/session'
import { getPaperAccount } from '@/lib/paper-trading'
import { serverError } from '@/lib/api-error'

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const account = await getPaperAccount(user.id)
    return NextResponse.json({ account })
  } catch (error) {
    return serverError(error, 'portfolio')
  }
}
