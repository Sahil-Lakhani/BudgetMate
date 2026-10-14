import { useState } from "react"
import { GROUP_MEMBER_LIMIT } from "../lib/validation"
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
    if (members.length + 1 > GROUP_MEMBER_LIMIT) { setError(`Groups are limited to ${GROUP_MEMBER_LIMIT} members, including you.`); return }
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
    } catch {
      setError("Failed to create group. Try again.")
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-sans font-bold text-ink">New Group</h1>
        <p className="text-news text-sm mt-1">Name your group and add members</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Group Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="group-name" className="text-sm font-medium text-ink block mb-1">Group Name</label>
            <Input
              id="group-name"
              maxLength={60}
              placeholder="e.g. Roommates, Bali Trip"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm font-medium text-ink block mb-2">Add Members</p>
            <UserSearch addedIds={addedIds} onAdd={handleAdd} />
            <p className="text-xs text-news mt-2">
              Only people who already have a BudgetMate account can be found. Members see the group name, each
              other's name, email and photo, and all splits in the group. Only add people who agreed to it.
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-news uppercase tracking-wider">Members ({members.length + 1})</p>
            <div key={user.uid} className="flex items-center gap-3 py-2 border-b border-border">
              {user.photoURL
                ? <img src={user.photoURL} referrerPolicy="no-referrer" loading="lazy" alt={user.displayName} className="w-8 h-8 rounded-full" />
                : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(user.displayName || user.email)[0].toUpperCase()}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{user.displayName} <span className="text-news font-normal">(You)</span></p>
                <p className="text-xs text-news truncate">{user.email}</p>
              </div>
            </div>
            {members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                {m.photoURL
                  ? <img src={m.photoURL} referrerPolicy="no-referrer" loading="lazy" alt={m.displayName} className="w-8 h-8 rounded-full" />
                  : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(m.displayName || m.email)[0].toUpperCase()}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                  <p className="text-xs text-news truncate">{m.email}</p>
                </div>
                <button type="button" onClick={() => handleRemove(m.userId)} aria-label={`Remove ${m.displayName || "member"}`} className="p-2 -m-2 text-news hover:text-red-500 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

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
