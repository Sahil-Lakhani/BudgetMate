import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getUserGroups, getUserNotifications, markNotificationRead, markAllNotificationsRead, subscribeSplitsForGroups, NOTIFICATIONS_CHANGED_EVENT } from "../lib/firestore"
import { computeBalances } from "../lib/balances"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Users, Plus, Loader2, Bell, Scale } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function Groups() {
  usePageTitle("Groups")
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const [groups, setGroups] = useState([])
  const [splits, setSplits] = useState([])
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      getUserGroups(user.uid).then(setGroups).catch(console.error),
      getUserNotifications(user.uid)
        .then((n) => setNotifications(n.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))))
        .catch(console.error)
    ]).finally(() => setLoading(false))
  }, [user])

  // Live splits across all my groups so balances move when anyone adds or settles
  const groupIdsKey = groups.map((g) => g.id).join(",")
  useEffect(() => {
    if (!groupIdsKey) return
    return subscribeSplitsForGroups(groupIdsKey.split(","), setSplits)
  }, [groupIdsKey])

  const overall = useMemo(() => computeBalances(splits, user.uid), [splits, user.uid])
  const netByGroup = useMemo(() => {
    const out = {}
    for (const g of groups) out[g.id] = computeBalances(splits.filter((s) => s.groupId === g.id), user.uid).net
    return out
  }, [groups, splits, user.uid])

  const renderNet = (value) => (
    <span className={`font-mono ${value > 0 ? "text-green-600" : value < 0 ? "text-red-500" : "text-news"}`}>
      {value > 0 ? "+" : value < 0 ? "−" : ""}{currencySymbol}{Math.abs(value).toFixed(2)}
    </span>
  )

  // Layout listens for this to re-count the nav badge
  const notifyBadge = () => window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT))

  const openNotification = async (n) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id))
    await markNotificationRead(user.uid, n.id).catch(console.error)
    notifyBadge()
    navigate(`/groups/${n.groupId}/split/${n.splitId}`)
  }

  const clearNotifications = async () => {
    setNotifications([])
    await markAllNotificationsRead(user.uid).catch(console.error)
    notifyBadge()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-sans font-bold text-ink">Groups</h1>
          <p className="text-news text-sm mt-1">Split bills with friends</p>
        </div>
        <Button onClick={() => navigate("/groups/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Group
        </Button>
      </div>

      {groups.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-news mb-3"><Scale className="h-3.5 w-3.5" /> Overall balance</div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-news">You owe</p>
                <p className={`text-xl font-bold font-sans ${overall.youOwe > 0 ? "text-red-500" : "text-ink"}`}>{currencySymbol}{overall.youOwe.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-news">You're owed</p>
                <p className={`text-xl font-bold font-sans ${overall.owedToYou > 0 ? "text-green-600" : "text-ink"}`}>{currencySymbol}{overall.owedToYou.toFixed(2)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-news">Net</p>
                <p className="text-xl font-bold font-sans">{renderNet(overall.net)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {notifications.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2"><Bell className="h-4 w-4" /> Activity</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearNotifications}>Mark all read</Button>
          </CardHeader>
          <CardContent className="divide-y divide-border">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => openNotification(n)}
                className="flex items-center gap-3 py-2.5 cursor-pointer hover:bg-ink/5 -mx-2 px-2 rounded-md transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">
                    <span className="font-medium">{n.payerName}</span> added you to a split at <span className="font-medium">{n.merchant}</span>
                  </p>
                  <p className="text-xs text-news truncate">{n.groupName}</p>
                </div>
                <p className="text-sm font-mono text-ink shrink-0">{currencySymbol}{Number(n.amount).toFixed(2)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

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
                <p className="text-xs text-news mt-0.5">
                  {g.members.length} member{g.members.length !== 1 ? "s" : ""}
                  {netByGroup[g.id] !== 0 && <> · {renderNet(netByGroup[g.id])}</>}
                </p>
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
