import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { createGroup } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { UserSearch } from "../components/UserSearch"
import { X, Loader2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"

export default function CreateGroup() {
  usePageTitle("New Group")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [members, setMembers] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const addedIds = [user.uid, ...members.map((m) => m.userId)]

  const handleAdd = (u) => {
    if (addedIds.includes(u.userId)) return
    setMembers((prev) => [...prev, u])
  }

  const handleRemove = (userId) => {
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  const handleCreate = async () => {
    if (!name.trim()) { setError("Group name is required"); return }
    setSaving(true)
    setError("")
    try {
      const selfMember = {
        userId: user.uid,
        displayName: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || ""
      }
      const groupId = await createGroup(user.uid, { name: name.trim(), members: [selfMember, ...members] })
      navigate(`/groups/${groupId}`)
    } catch (e) {
      setError("Failed to create group. Try again.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-serif font-bold text-ink">New Group</h1>
        <p className="text-news text-sm mt-1">Name your group and add members</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-ink block mb-1">Group Name</label>
            <Input
              placeholder="e.g. Roommates, Bali Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-ink block mb-2">Add Members</label>
            <UserSearch addedIds={addedIds} onAdd={handleAdd} />
          </div>

          {members.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-news uppercase tracking-wider">Added ({members.length})</p>
              {members.map((m) => (
                <div key={m.userId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                  {m.photoURL
                    ? <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full" />
                    : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(m.displayName || m.email)[0].toUpperCase()}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                    <p className="text-xs text-news truncate">{m.email}</p>
                  </div>
                  <button onClick={() => handleRemove(m.userId)} className="text-news hover:text-red-500 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => navigate("/groups")} className="flex-1">Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="flex-1 gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create Group
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
