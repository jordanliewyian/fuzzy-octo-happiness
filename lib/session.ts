import { cookies } from 'next/headers'
import { sql } from './db'
import { randomToken } from './password'
import type { NextResponse } from 'next/server'

const name = process.env.SESSION_COOKIE_NAME || 'robinhood_session'
const maxAge = 60 * 60 * 24 * 30

export async function createSession(userId: string) {
  const token = randomToken()
  await sql`insert into sessions(token,user_id,expires_at) values(${token},${userId},now()+interval '30 days')`
  return token
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(name, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

export async function getUser() {
  const c = await cookies()
  const token = c.get(name)?.value
  if (!token) return null
  const rows = await sql`select u.id,u.email from sessions s join users u on u.id=s.user_id where s.token=${token} and s.expires_at>now()`
  return rows[0] || null
}

export async function clearSession() {
  const c = await cookies()
  const token = c.get(name)?.value
  if (token) await sql`delete from sessions where token=${token}`
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(name, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
