import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, subscribeGroupSplits, leaveGroup, deleteGroup } from "../lib/firestore"
import { computeBalances } from "../lib/balances"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Plus, Loader2, ArrowLeft, Users, LogOut, Trash2 } from "lucide-react"
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
  const [confirming, setConfirming] = useState(null) // null | "leave" | "delete"
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!groupId) return
    getGroup(groupId).then(setGroup).catch(console.error).finally(() => setLoading(false))
    // Live: balances update the moment anyone adds or settles a split
    const unsubscribe = subscribeGroupSplits(groupId, setSplits)
    return unsubscribe
  }, [groupId])

  const balances = useMemo(() => computeBalances(splits, user.uid), [splits, user.uid])
  const isCreator = group?.createdBy === user.uid
  const unsettledCount = splits.filter((s) => s.participants.some((p) => p.status !== "settled")).length

  const memberName = (uid) => group?.members.find((m) => m.userId === uid)?.displayName || balances.byMember[uid]?.displayName || "Member"

  const handleLeave = async () => {
    setBusy(true); setError("")
    try {
      await leaveGroup(groupId, user.uid)
      navigate("/groups")
    } catch (e) {
      console.error(e); setError("Couldn't leave the group. Try again."); setBusy(false)
    }
  }

  const handleDelete = async () => {
    setBusy(true); setError("")
    try {
      await deleteGroup(groupId)
      navigate("/groups")
    } catch (e) {
      console.error(e); setError("Couldn't delete the group. Try again."); setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!group) return <p className="text-news">Group not found.</p>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/groups")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-sans font-bold text-ink">{group.name}</h1>
          <p className="text-news text-sm">{group.members.length} members</p>
        </div>
        <Button onClick={() => navigate(`/groups/${groupId}/split/new`)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Split
        </Button>
      </div>

      {/* Balances */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-news">You owe</p>
              <p className={`text-2xl font-bold font-sans ${balances.youOwe > 0 ? "text-red-500" : "text-ink"}`}>
                {currencySymbol}{balances.youOwe.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-news">You're owed</p>
              <p className={`text-2xl font-bold font-sans ${balances.owedToYou > 0 ? "text-green-600" : "text-ink"}`}>
                {currencySymbol}{balances.owedToYou.toFixed(2)}
              </p>
            </div>
          </div>
          {Object.keys(balances.byMember).length > 0 && (
            <div className="mt-4 pt-4 border-t border-border space-y-1.5">
              {Object.entries(balances.byMember).map(([uid, b]) => (
                <p key={uid} className="text-sm text-ink flex justify-between">
                  <span>{b.amount > 0 ? `${memberName(uid)} owes you` : `You owe ${memberName(uid)}`}</span>
                  <span className={`font-mono ${b.amount > 0 ? "text-green-600" : "text-red-500"}`}>
                    {currencySymbol}{Math.abs(b.amount).toFixed(2)}
                  </span>
                </p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
        <h2 className="text-lg font-sans font-bold text-ink mb-3">Splits</h2>
        {splits.length === 0 && (
          <Card>
            <CardContent className="text-center py-12 text-news">
              No splits yet. Tap "Add Split" to create one.
            </CardContent>
          </Card>
        )}
        {/* Stacked rows on mobile; tile grid from md up */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {splits.map((s) => {
            const myShare = s.participants.find((p) => p.userId === user.uid)
            const settledCount = s.participants.filter((p) => p.status === "settled").length
            const allSettled = settledCount === s.participants.length
            const payer = s.participants.find((p) => p.userId === s.payerId)
            const payerName = s.payerId === user.uid ? "you" : (payer?.displayName || "someone")
            const myPending = myShare && myShare.status !== "settled" && s.payerId !== user.uid
            return (
              <Card
                key={s.id}
                className="cursor-pointer hover:border-ink/30 hover:shadow-md transition-all"
                onClick={() => navigate(`/groups/${groupId}/split/${s.id}`)}
              >
                <CardContent className="py-4 md:pt-5 md:pb-5 flex items-center md:flex-col md:items-stretch gap-4 md:gap-3 md:h-full">
                  {/* Title + status */}
                  <div className="flex-1 min-w-0 md:flex-none">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-ink truncate md:text-lg">{s.merchant}</p>
                      <span className={`hidden md:inline-block text-xs px-2 py-0.5 rounded-full shrink-0 ${allSettled ? "bg-green-100 text-green-700" : "bg-ink/10 text-news"}`}>
                        {allSettled ? "Settled" : `${settledCount}/${s.participants.length} settled`}
                      </span>
                    </div>
                    <p className="text-xs text-news mt-0.5">{s.date}</p>
                    <p className="text-xs text-news md:mt-2">
                      <span className="text-ink font-medium">{currencySymbol}{s.totalAmount.toFixed(2)}</span> paid by {payerName}
                    </p>
                  </div>

                  {/* Your share */}
                  <div className="text-right md:text-left shrink-0 md:mt-auto md:pt-3 md:border-t md:border-border">
                    {myShare ? (
                      <>
                        <p className="hidden md:block text-[11px] uppercase tracking-wider text-news">Your share</p>
                        <p className={`text-sm md:text-xl font-bold font-sans ${myPending ? "text-red-500" : "text-ink"}`}>
                          {currencySymbol}{myShare.amount.toFixed(2)}
                          <span className="md:hidden text-news font-normal text-xs"> your share</span>
                        </p>
                        {myShare.status === "settled" && s.payerId !== user.uid && (
                          <p className="hidden md:block text-xs text-green-600">You've settled</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-news md:pt-1">Not included</p>
                    )}
                    <span className={`md:hidden text-xs mt-1 inline-block px-2 py-0.5 rounded-full ${allSettled ? "bg-green-100 text-green-700" : "bg-ink/10 text-news"}`}>
                      {allSettled ? "Settled" : "Pending"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Leave / delete */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {confirming === null && (
            isCreator ? (
              <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirming("delete")}>
                <Trash2 className="h-4 w-4" /> Delete group
              </Button>
            ) : (
              <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => setConfirming("leave")}>
                <LogOut className="h-4 w-4" /> Leave group
              </Button>
            )
          )}
          {confirming === "leave" && (
            <>
              <p className="text-sm text-ink">Leave <span className="font-medium">{group.name}</span>? Splits you're already part of stay as they are.</p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={busy} onClick={handleLeave}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Leave"}
                </Button>
              </div>
            </>
          )}
          {confirming === "delete" && (
            <>
              <p className="text-sm text-ink">
                Delete <span className="font-medium">{group.name}</span> and all {splits.length} split{splits.length !== 1 ? "s" : ""}? This can't be undone.
                {unsettledCount > 0 && <span className="block mt-1 text-red-500">{unsettledCount} split{unsettledCount !== 1 ? "s are" : " is"} still unsettled.</span>}
              </p>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirming(null)}>Cancel</Button>
                <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" disabled={busy} onClick={handleDelete}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>
    </div>
  )
}
