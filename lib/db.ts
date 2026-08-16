import { neon, Pool } from '@neondatabase/serverless'

type DbRow = Record<string, any>

let client: ReturnType<typeof neon> | undefined
let pool: Pool | undefined

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL
}

function getClient() {
  if (client) return client
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('Database connection is not configured')
  }
  client = neon(url)
  return client
}

function getPool() {
  if (pool) return pool
  const url = getDatabaseUrl()
  if (!url) {
    throw new Error('Database connection is not configured')
  }
  pool = new Pool({ connectionString: url, max: 2 })
  return pool
}

export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<DbRow[]> {
  return getClient()(strings, ...values) as unknown as Promise<DbRow[]>
}

export async function withTransaction<T>(fn: (tx: { query: (text: string, values?: unknown[]) => Promise<{ rows: DbRow[]; rowCount: number | null }> }) => Promise<T>) {
  const connection = await getPool().connect()
  try {
    await connection.query('BEGIN')
    const result = await fn(connection)
    await connection.query('COMMIT')
    return result
  } catch (error) {
    await connection.query('ROLLBACK')
    throw error
  } finally {
    connection.release()
  }
}
