import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getUserGroups } from "../lib/firestore"
import { Card, CardContent } from "../components/Card"
import { Button } from "../components/Button"
import { Users, Plus, Loader2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"

export default function Groups() {
  usePageTitle("Groups")
  const { user } = useAuth()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getUserGroups(user.uid)
      .then(setGroups)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">Groups</h1>
          <p className="text-news text-sm mt-1">Split bills with friends</p>
        </div>
        <Button onClick={() => navigate("/groups/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-news" />
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-center gap-4">
            <Users className="h-12 w-12 text-news" />
            <div>
              <p className="font-medium text-ink">No groups yet</p>
              <p className="text-sm text-news mt-1">Create a group to start splitting bills</p>
            </div>
            <Button onClick={() => navigate("/groups/new")}>Create your first group</Button>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {groups.map((g) => (
          <Card key={g.id} className="cursor-pointer hover:border-ink/30 transition-colors" onClick={() => navigate(`/groups/${g.id}`)}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-full bg-ink flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-paper" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-ink">{g.name}</p>
                <p className="text-xs text-news mt-0.5">{g.members.length} member{g.members.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="flex -space-x-2">
                {g.members.slice(0, 3).map((m) => (
                  m.photoURL
                    ? <img key={m.userId} src={m.photoURL} alt={m.displayName} className="w-7 h-7 rounded-full border-2 border-paper" />
                    : <div key={m.userId} className="w-7 h-7 rounded-full border-2 border-paper bg-news-light flex items-center justify-center text-xs font-bold text-ink">{(m.displayName || "?")[0]}</div>
                ))}
                {g.members.length > 3 && (
                  <div className="w-7 h-7 rounded-full border-2 border-paper bg-news-light flex items-center justify-center text-xs font-bold text-ink">
                    +{g.members.length - 3}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
