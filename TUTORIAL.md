# switxhbooks tutorial

A guided build of a personal QuickBooks replacement, done to learn databases. You write the code. Ask questions in the Claude chat as you go.

**Stack:** Vite + React (`web/`), Express + TypeScript (`server/`), SQLite via `better-sqlite3` using raw SQL. Drizzle and a move to Next.js come later.

**How each step works:** read the concept, do the task, run the check, then answer the questions in chat. Ask for a hint any time you're stuck.

**Ground rule:** if a piece of code would need a Google search to know how to write it (library APIs, import syntax, Node built-ins, config), Claude gives you the code and explains it. You write the parts that follow from the concepts: SQL, query logic, and design decisions.

---

## Lessons

| # | Lesson | Status |
|---|---|---|
| 1 | [Setup: open the database](#lesson-1-setup-open-the-database) | in progress |
| 2 | Schema design | |
| 3 | Migration runner | |
| 4 | Seed and basic CRUD | |
| 5 | Transactions page | |
| 6 | Reporting queries | |
| 7 | Indexes | |
| 8 | Imports (QuickBooks, Venmo, generic CSV) | |
| 9 | Backups | |
| 10 | Plaid (sandbox) | |
| 11 | PayPal (sandbox) | |
| 12 | Switch to Drizzle | |
| 13 | Move to Next.js | |
| 14 | Plaid production and real accounts | |

Each later lesson gets written out here in detail when we reach it. There's an outline at the bottom.

---

## Lesson 1: Setup: open the database

### Target layout
```
switxhbooks/
  package.json        ← root: one `npm run dev` that starts both
  TUTORIAL.md
  web/                ← Vite + React (browser code only)
  server/             ← Express API (the only code that touches the DB)
    .env              ← DB_PATH, later API secrets (gitignored)
    .env.example      ← committed placeholder version of .env
    data/books.db     ← the database (gitignored)
    src/db.ts         ← opens SQLite
    src/index.ts      ← Express app
```

### Checklist
- [x] Scaffold `web/` with Vite + React + TypeScript
- [x] Tailwind plugin and the `/api` proxy in `web/vite.config.ts`
- [x] Scaffold `server/` with Express, `better-sqlite3`, `dotenv`, `tsx`, TypeScript, and `"type": "module"`
- [x] `server/.gitignore` (ignores `.env`, `data/`, `*.db*`)
- [x] `server/.env` with `DB_PATH="./data/books.db"`
- [x] Fix `server/tsconfig.json` (`types: ["node"]`, `rootDir`, `outDir`)
- [ ] Add `"typecheck": "tsc --noEmit"` to `server/package.json`
- [x] **Step A: `server/src/db.ts`**, in 5 pieces (below)
- [x] **Step B: `server/src/index.ts`**, with the health route and graceful shutdown
- [ ] `server/.env.example`
- [ ] Root `package.json` with `concurrently`, plus a root `.gitignore`
- [ ] Clean out the Vite template; `App.tsx` shows `/api/health`
- [ ] First commit

### TypeScript gotchas in this setup
- **Relative imports need `.js`** even though the file is `.ts`: write `import { db } from './db.js'`. That's because of `"module": "nodenext"`; `tsx` maps the import to `db.ts`.
- **Type-only imports need `import type`**, for example `import type { Request, Response } from 'express'`. That's because of `verbatimModuleSyntax`.
- **`tsx` doesn't type-check.** It strips the types and runs the code. Rely on the editor's red underlines or `npm run typecheck`.

---

### Step A: `server/src/db.ts`

Build it one piece at a time. Run it after each piece.

#### A1. Load `.env` and read `DB_PATH`

**Concepts**
- `.env` is just a text file. The `dotenv` package reads it and copies each `KEY=value` into **`process.env`**.
- `import 'dotenv/config'` is a **side-effect import**. It brings in no names; importing it runs the code that loads `.env`. Put it first, because anything that reads `process.env` before it will see `undefined`.
- dotenv looks for `.env` in the **current working directory (cwd)**, the folder the process was started from.
- Every `process.env` value is a **string or `undefined`**. `PORT=3001` arrives as `"3001"`. TypeScript types each value as `string | undefined`.
- **Fail fast:** a missing setting should stop the app at startup with a clear message, not cause strange behavior later.

**Task**
1. Load the environment with the side-effect import.
2. Read `process.env.DB_PATH` into a constant.
3. If it's missing or empty, `throw new Error(...)` with a message that says *what* is missing and *where* to set it.
4. Temporarily, `console.log` the value.

**Check**
- From `server/`: `npx tsx src/db.ts` should print `./data/books.db`.
- Rename `DB_PATH` in `.env` to `DB_PATHX` and run it again. You should get *your* error. Then change it back.

**Questions**
1. After your `if` check, hover over the constant. What type does TypeScript show, and why did it change?
2. Run it from the repo root: `npx tsx server/src/db.ts`. What happens, and why?

#### A2. Resolve the path relative to the source file

**Concepts**
- A relative path like `./data/books.db` is resolved against the **cwd** by default. Start the server from a different folder and SQLite quietly creates a **new, empty database** somewhere else.
- `import.meta.dirname` is the folder containing the *current file*, here always `.../server/src`, whatever the cwd. It's available in Node 20.11+ in ES modules.
- `path.resolve(a, b, c)` joins the pieces from left to right into an absolute path. If a later piece is already absolute, it starts over from that piece, so an absolute `DB_PATH` also works.
- The same cwd problem affects dotenv (Question 2 above). The fix is the same: tell dotenv exactly where `.env` is.

**Task**
1. Import `path` from `'node:path'`. The `node:` prefix marks a built-in module.
2. Compute the server root, one level up from `import.meta.dirname`.
3. Replace the side-effect import with `dotenv`'s `config({ path: ... })`, pointing at `server/.env` through the server root. Remember that imports are hoisted: think about what order things run in.
4. Resolve `DB_PATH` against the server root and log the absolute path.

**Check**
- `npx tsx src/db.ts` from `server/` and `npx tsx server/src/db.ts` from the root should both print **the same absolute path**.

**Questions**
1. If `DB_PATH` were `/tmp/test.db`, what would `path.resolve` return?
2. If you later compile to `server/dist/db.js`, does going "one level up" still land on `server/`?

#### A3. Create the folder if it's missing

**Concepts**
- `better-sqlite3` creates the database **file** if it's missing, but not the **folder**. A fresh clone has no `server/data/`, because git doesn't track empty folders and that folder is ignored anyway.
- `fs.mkdirSync(dir, { recursive: true })` creates the folder and any missing parent folders, and does **nothing** if it already exists. An operation that's safe to run any number of times is **idempotent**. You'll see that word again with seeds, migrations and upserts.
- `path.dirname(p)` gives the folder part of a path.

**Task**: create the database's folder before opening it.

**Check**: delete `server/data/` and run it. The folder should come back. Run it again; there should be no error.

**Question**: why is the synchronous `mkdirSync` fine here, even though Node usually prefers async?

#### A4. Open the database

**Concepts**
- `new Database(path)` opens the file, or creates it if it's missing, and gives you a **connection**: your handle for running SQL.
- Useful options:
  - `{ fileMustExist: true }` raises an error instead of creating a file
  - `{ verbose: console.log }` prints every SQL statement it runs, which is good for learning
- A new SQLite file is **0 bytes** until something is written to it.
- macOS includes the `sqlite3` command-line tool, so you can look at the database outside your app.

**Task**: open the database at the resolved path. Optionally, turn on `verbose` while you're learning.

**Check**
- `ls -la server/data` shows `books.db`.
- `sqlite3 server/data/books.db "select sqlite_version();"` works. The CLI may show a different version from `better-sqlite3`, which bundles its own copy of SQLite.

**Question**: what would happen if two separate processes opened this file and both wrote to it?

#### A5. Set the pragmas and export `db`

**Concepts**
- **`journal_mode = WAL`** (Write-Ahead Log): changes are appended to `books.db-wal` and copied into `books.db` at checkpoints, so readers and the writer don't block each other. This setting is **stored in the database file**.
- **`synchronous = NORMAL`** controls how often SQLite forces data to disk. With WAL it's still safe from corruption; a power cut could lose only the last few commits. This setting is **per connection**.
- **`foreign_keys = ON`**: SQLite does **not** enforce foreign keys by default. This setting is **per connection**, so it must be set every time the database is opened.
- `db.pragma('name = value')` sets a pragma. `db.pragma('name', { simple: true })` reads a single value.

| Journal mode | Idea | Safe after a crash? |
|---|---|---|
| DELETE (default) | Save old pages in a journal, change the main file, then delete the journal | ✅ |
| TRUNCATE / PERSIST | Same, but the journal is truncated or kept instead of deleted | ✅ |
| MEMORY | Journal kept in RAM | ⚠️ |
| WAL | Append changes to a log, checkpoint later | ✅ |
| OFF | No journal | ❌ |

**Task**
1. Set all three pragmas right after opening the database.
2. Read each one back and log it.
3. `export` the connection as `db`.
4. Remove the temporary logs once it works. Keep one startup line, such as `DB: /abs/path (wal)`.

**Check**: the logs should show `wal`, `1` (NORMAL) and `1` (ON). `ls server/data` shows `books.db-wal` and `books.db-shm` appear once the database is opened.

**Questions**
1. Why does `journal_mode` persist in the file but `foreign_keys` doesn't? What would break if you set `foreign_keys` only once, in a setup script?
2. What would `import { db } from './db.js'` do if two different files imported it? Does it open two connections?

---

### Step B: `server/src/index.ts`

**Concepts**
- Express routes: `app.get('/api/health', (req, res) => res.json({...}))`. Keep the `/api` prefix, because the Vite proxy forwards the path unchanged.
- `app.listen(3001)` returns the HTTP `server` object. Keep it so you can close it.
- **Graceful shutdown:** Ctrl-C sends `SIGINT`, and `tsx watch` sends a signal when it restarts the server. Handle `SIGINT` and `SIGTERM` this way:
  1. stop accepting new requests (`server.close()`)
  2. close the database (`db.close()`)
  3. `process.exit(0)`

**Task**
1. Create the app and add `GET /api/health`. It should return `{ sqlite_version, journal_mode, synchronous, foreign_keys }`, with the version from `SELECT sqlite_version() AS v`.
2. Listen on 3001 and log the URL.
3. Add the shutdown handler.
4. Point the `dev` script at `src/index.ts`, which it already is.

**Check**
- `curl localhost:3001/api/health` returns the JSON.
- Save a file and watch it restart. Your shutdown log should print.

**Question**: why close the HTTP server *before* the database, rather than the other way around?

---

### Steps C–F: plumbing (ask for the code if you'd like it)
- **C.** `server/.env.example`, a committed copy of `.env` with placeholder values.
- **D.** Root `package.json`: `npm init -y`, `npm i -D concurrently`, and a `"dev"` script that runs `npm --prefix server run dev` and `npm --prefix web run dev`. Root `.gitignore`: `node_modules/` and `.DS_Store`.
- **E.** Vite cleanup: delete `App.css`, `src/assets/` and the template CSS below `@import 'tailwindcss'`. Rewrite `App.tsx` to `fetch('/api/health')` and show the result.
- **F.** `npm run dev` from the root, open `localhost:5173`, see the health data, then **commit**.

---

## Outline of later lessons
2. **Schema design.** Tables, column types, primary keys and foreign keys, `NOT NULL`, `CHECK` and `DEFAULT`; money as integer cents; dates as ISO text. You write `001_init.sql`.
3. **Migration runner.** A `schema_migrations` table that applies new files in order, inside a transaction. A second migration adds a column.
4. **Seed and basic CRUD.** An idempotent category seed; manual add, edit and delete using parameterized queries, which also covers SQL injection.
5. **Transactions page.** `WHERE` filters, `LIKE` search, `LIMIT`/`OFFSET` compared with keyset pagination, bulk `UPDATE ... WHERE id IN`.
6. **Reporting queries.** `SUM(CASE ...)`, grouping by month with `strftime`, `LEFT JOIN` with categories, filling in empty months; then the dashboard and chart.
7. **Indexes.** `EXPLAIN QUERY PLAN` before and after; composite indexes; `synchronous` and performance.
8. **Imports.** `UNIQUE(account_id, external_id)` and `INSERT ... ON CONFLICT DO UPDATE`, a transaction per import, the QuickBooks overlap cutoff, category rules.
9. **Backups.** `db.backup()` snapshots to iCloud, why copying a live WAL database isn't safe, practicing a restore.
10. **Plaid (sandbox).** Encrypted tokens, the sync cursor, and added, modified and removed rows inside a transaction.
11. **PayPal (sandbox).** Syncing in 31-day windows and the `sync_runs` log.
12. **Drizzle.** Rewrite modules with an ORM and compare its SQL with the hand-written versions.
13. **Next.js.** Port the app; Server Components reading the database directly, `"use client"`, the `globalThis` connection cache.
14. **Plaid production.** Real accounts.
