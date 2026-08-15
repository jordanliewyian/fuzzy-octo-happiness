import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const { Client } = pg
const here = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(here, '..', 'db', 'migrations')
const checkOnly = process.argv.includes('--check')

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? process.env.POSTGRES_PRISMA_URL
}

function migrationVersion(fileName) {
  const match = /^(\d+)_.*\.sql$/.exec(fileName)
  if (!match) throw new Error(`Invalid migration filename: ${fileName}`)
  return match[1]
}

async function main() {
  const connectionString = getDatabaseUrl()
  if (!connectionString) {
    throw new Error('DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL must be configured')
  }

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith('.sql'))
    .sort()

  const versions = files.map(migrationVersion)
  if (new Set(versions).size !== versions.length) {
    throw new Error('Duplicate migration version detected')
  }

  const client = new Client({ connectionString })
  await client.connect()

  try {
    await client.query(`
      create table if not exists schema_migrations (
        version text primary key,
        applied_at timestamptz not null default now()
      )
    `)

    await client.query("select pg_advisory_lock(hashtext('robinhood-clone:migrations'))")

    const applied = new Set(
      (await client.query('select version from schema_migrations order by version')).rows.map((row) => row.version),
    )
    const pending = files.filter((file) => !applied.has(migrationVersion(file)))

    if (checkOnly) {
      if (pending.length === 0) {
        console.log('Database schema is up to date.')
        return
      }
      console.log(`Pending migrations: ${pending.join(', ')}`)
      process.exitCode = 1
      return
    }

    for (const file of pending) {
      const version = migrationVersion(file)
      const sql = await readFile(join(migrationsDir, file), 'utf8')
      console.log(`Applying ${file}...`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('insert into schema_migrations(version) values($1)', [version])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} failed: ${error instanceof Error ? error.message : String(error)}`)
      }
      console.log(`Applied ${file}`)
    }

    console.log('Database migrations complete.')
  } finally {
    try {
      await client.query("select pg_advisory_unlock(hashtext('robinhood-clone:migrations'))")
    } catch {
      // Ignore unlock failures while closing the connection.
    }
    await client.end()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
