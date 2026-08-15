import { neon } from '@neondatabase/serverless'

type DbRow = Record<string, any>

let client: ReturnType<typeof neon> | undefined

function getClient() {
  if (client) return client
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not configured')
  client = neon(url)
  return client
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRow[]> {
  return getClient()(strings, ...values) as unknown as Promise<DbRow[]>
}
