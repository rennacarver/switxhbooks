import path from 'node:path'
import { config } from 'dotenv'
import fs from 'node:fs'
import Database from 'better-sqlite3'

const serverRoot = path.resolve(import.meta.dirname, '..')
config({ path: path.resolve(serverRoot, '.env') })
const dbPath = process.env.DB_PATH

if (!dbPath) {
  throw new Error(
    'DB_PATH is not set. Add it to server/.env (see .env.example).',
  )
}

const absDBPath = path.resolve(serverRoot, dbPath)
fs.mkdirSync(path.dirname(absDBPath), { recursive: true })

export const db = new Database(absDBPath, { verbose: console.log })

db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')
db.pragma('foreign_keys = ON')
