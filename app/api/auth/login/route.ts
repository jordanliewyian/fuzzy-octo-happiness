import { NextResponse } from 'next/server'
import { z } from 'zod'
import { sql } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSession, setSessionCookie } from '@/lib/session'
import { serverError } from '@/lib/api-error'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json())
    const rows = await sql`select id,password_hash from users where email=${body.email.toLowerCase()}`
    if (!rows[0] || !(await verifyPassword(body.password, rows[0].password_hash))) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    const token = await createSession(rows[0].id)
    const response = NextResponse.json({ ok: true })
    setSessionCookie(response, token)
    return response
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    return serverError(error, 'auth/login')
  }
}
