import express from 'express'
import { db } from './db.js'

const app = express()
app.use(express.json())

app.get('/api/health', (_req, res) => {
  const { v } = db.prepare('SELECT sqlite_version() AS v').get() as {
    v: string
  }

  res.json({
    sqlite_version: v,
    journal_mode: db.pragma('journal_mode', { simple: true }),
    synchronous: db.pragma('synchronous', { simple: true }),
    foreign_keys: db.pragma('foreign_keys', { simple: true }),
  })
})

const PORT = Number(process.env.PORT ?? 3001)
const server = app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`)
})

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    db.close()
    console.log('DB closed')
    process.exit(0)
  })
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))
