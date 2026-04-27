import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, getGroupSplits } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Plus, Loader2, ArrowLeft, Users } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function GroupDetail() {
  usePageTitle("Group")
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [group, setGroup] = useState(null)
  const [splits, setSplits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!groupId) return
    Promise.all([getGroup(groupId), getGroupSplits(groupId)])
      .then(([g, s]) => { setGroup(g); setSplits(s) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [groupId])

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!group) return <p className="text-news">Group not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-ink">{group.name}</h1>
          <p className="text-news text-sm">{group.members.length} members</p>
        </div>
        <Button onClick={() => navigate(`/groups/${groupId}/split/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Split
        </Button>
      </div>

      {/* Members */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Members</CardTitle></CardHeader>
        <CardContent className="divide-y divide-border">
          {group.members.map((m) => (
            <div key={m.userId} className="flex items-center gap-3 py-2.5">
              {m.photoURL
                ? <img src={m.photoURL} alt={m.displayName} className="w-8 h-8 rounded-full" />
                : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(m.displayName || "?")[0]}</div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink truncate">{m.displayName}</p>
                <p className="text-xs text-news truncate">{m.email}</p>
              </div>
              {m.userId === group.createdBy && (
                <span className="text-xs bg-ink/10 text-ink px-2 py-0.5 rounded-full">Creator</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Splits */}
      <div>
        <h2 className="text-lg font-serif font-bold text-ink mb-3">Splits</h2>
        {splits.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-news">
              No splits yet. Tap "Add Split" to create one.
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {splits.map((s) => {
            const myShare = s.participants.find((p) => p.userId === user.uid)
            const allSettled = s.participants.every((p) => p.status === "settled")
            return (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-ink/30 transition-colors"
                onClick={() => navigate(`/groups/${groupId}/split/${s.id}`)}
              >
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-ink truncate">{s.merchant}</p>
                    <p className="text-xs text-news mt-0.5">{s.date}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-ink">
                      {currencySymbol}{myShare ? myShare.amount.toFixed(2) : "—"} <span className="text-news font-normal text-xs">your share</span>
                    </p>
                    <span className={`text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${allSettled ? "bg-green-100 text-green-700" : "bg-ink/10 text-news"}`}>
                      {allSettled ? "Settled" : "Pending"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
