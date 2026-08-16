import { NextResponse } from 'next/server'

export const GENERIC_SERVER_ERROR = 'There was an unexpected issue on our end. Please try again later'

export function serverError(error: unknown, context: string) {
  console.error(`[${context}]`, error)
  return NextResponse.json({ error: GENERIC_SERVER_ERROR }, { status: 500 })
}
