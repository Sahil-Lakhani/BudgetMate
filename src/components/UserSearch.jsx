import { useState, useCallback, useEffect, useRef } from "react"
import { Input } from "./Input"
import { Loader2, Plus, Check } from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { searchUsersByEmail, searchUsersByName } from "../lib/firestore"

const SEARCH_DEBOUNCE_MS = 300

export function UserSearch({ addedIds = [], onAdd }) {
  const { user } = useAuth()
  const [query, setQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  // Never offer the current user, and skip profiles with nothing to show
  const visible = useCallback(
    (list) => list.filter((u) => u.userId !== user?.uid && (u.displayName || u.email)),
    [user?.uid]
  )

  const search = useCallback(async (value) => {
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
      setSearchResults(visible(deduped))
    } catch {
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }, [visible])

  const handleChange = (e) => {
    const val = e.target.value
    setQuery(val)
    clearTimeout(debounceRef.current)
    if (val.length < 2) { setSearchResults([]); return }
    debounceRef.current = setTimeout(() => search(val), SEARCH_DEBOUNCE_MS)
  }

  useEffect(() => () => clearTimeout(debounceRef.current), [])

  // Nothing is listed until the user has typed at least 2 characters
  const displayList = query.length >= 2 ? searchResults : []

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          placeholder="Search by name or email…"
          value={query}
          onChange={handleChange}
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-news" />
        )}
      </div>

      {displayList.length > 0 && (
        <div className="border border-border rounded-md bg-card divide-y divide-border max-h-56 overflow-y-auto">
          {displayList.map((u) => {
            const alreadyAdded = addedIds.includes(u.userId)
            return (
              <div
                key={u.userId}
                onClick={() => !alreadyAdded && onAdd(u)}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 transition-colors",
                  alreadyAdded
                    ? "opacity-50 cursor-default"
                    : "cursor-pointer hover:bg-ink/5 active:bg-ink/10"
                ].join(" ")}
              >
                {u.photoURL ? (
                  <img src={u.photoURL} alt={u.displayName} className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold text-ink shrink-0">
                    {(u.displayName || u.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{u.displayName || "—"}</p>
                  <p className="text-xs text-news truncate">{u.email}</p>
                </div>
                <div className="shrink-0 ml-2">
                  {alreadyAdded ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-medium text-ink/70 border border-border rounded px-2 py-0.5">
                      <Plus className="h-3 w-3" /> Add
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
