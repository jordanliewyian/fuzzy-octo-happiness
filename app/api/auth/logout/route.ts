import { NextResponse } from 'next/server'
import { clearSession, clearSessionCookie } from '@/lib/session'

export async function POST() {
  await clearSession()
  const response = NextResponse.json({ ok: true })
  clearSessionCookie(response)
  return response
}
