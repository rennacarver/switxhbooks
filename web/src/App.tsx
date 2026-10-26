import { useEffect, useState } from 'react'

type Health = {
  sqlite_version: string
  journal_mode: string
  syncrhonous: number
  foreign_keys: number
}

function App() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<Health>
      })
      .then(setHealth)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : String(err)),
      )
  }, [])

  return (
    <main className='mx-auto max-w-xl p-8'>
      <h1 className='text-3xl font-bold'>switxhbooks</h1>
      {error && <p className='mt-4 text-red-600'>API error: {error}</p>}
      {!error && !health && <p className='mt-4 text-gray-500'>Loading…</p>}
      {health && (
        <pre className='mt-4 rounded bg-gray-100 p-4 text-sm'>
          {JSON.stringify(health, null, 2)}
        </pre>
      )}
    </main>
  )
}

export default App
