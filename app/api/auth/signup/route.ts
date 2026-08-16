import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSession, setSessionCookie } from '@/lib/session'
import { serverError } from '@/lib/api-error'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json())
    const email = body.email.toLowerCase()
    const existing = await sql`select id from users where email=${email}`
    if (existing[0]) return NextResponse.json({ error: 'Account already exists' }, { status: 409 })
    const hash = await hashPassword(body.password)
    const rows = await sql`insert into users(email,password_hash) values(${email},${hash}) returning id`
    const token = await createSession(rows[0].id)
    const response = NextResponse.json({ ok: true })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return serverError(error, 'auth/signup')
  }
}
