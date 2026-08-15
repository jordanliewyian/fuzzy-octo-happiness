import { neon } from '@neondatabase/serverless'

let client: ReturnType<typeof neon> | undefined

function getClient() {
  if (client) return client
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not configured')
  client = neon(url)
  return client
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]) {
  return getClient()(strings, ...values)
}
