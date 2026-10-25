import path from 'node:path'
import { config } from 'dotenv'
import fs from 'node:fs'

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
