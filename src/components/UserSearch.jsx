import { useState, useCallback } from "react"
import { Input } from "./Input"
import { Loader2, UserPlus, Check } from "lucide-react"
import { searchUsersByEmail, searchUsersByName } from "../lib/firestore"

export function UserSearch({ addedIds = [], onAdd }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (value) => {
    if (value.length < 3) { setResults([]); return }
    setLoading(true)
    try {
      const [byEmail, byName] = await Promise.all([
        searchUsersByEmail(value),
        searchUsersByName(value)
      ])
      const merged = [...byEmail, ...byName]
      const deduped = merged.filter(
        (u, i, arr) => arr.findIndex((x) => x.userId === u.userId) === i
      )
      setResults(deduped)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    search(val)
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search by email or name (min 3 chars)"
          value={query}
          onChange={handleChange}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-news" />
        )}
      </div>

      {results.length > 0 && (
        <div className="border border-border rounded-md bg-card divide-y divide-border">
          {results.map((u) => {
            const alreadyAdded = addedIds.includes(u.userId)
            return (
              <div key={u.userId} className="flex items-center gap-3 px-3 py-2">
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold text-ink">
                    {(u.displayName || u.email)[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{u.displayName || "—"}</p>
                  <p className="text-xs text-news truncate">{u.email}</p>
                </div>
                <button
                  disabled={alreadyAdded}
                  onClick={() => onAdd(u)}
                  className="shrink-0 p-1 rounded-md text-ink/60 hover:text-ink hover:bg-ink/8 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {alreadyAdded ? <Check className="h-4 w-4 text-green-500" /> : <UserPlus className="h-4 w-4" />}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
