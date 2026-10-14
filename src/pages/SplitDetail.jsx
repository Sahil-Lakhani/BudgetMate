import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getSplit, settleSplit } from "../lib/firestore"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { ArrowLeft, Loader2, CheckCircle2 } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function SplitDetail() {
  const [split, setSplit] = useState(null)
  usePageTitle(split?.merchant || "Split")
  const { groupId, splitId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)
  const [settledNote, setSettledNote] = useState("")

  const load = () => {
    getSplit(splitId)
      .then(setSplit)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [splitId])

  const handleSettle = async (targetUserId) => {
    setSettling(true)
    setSettledNote("")
    try {
      await settleSplit(splitId, targetUserId)
      const isPayer = user.uid === split.payerId
      setSettledNote(targetUserId === split.payerId
        ? "Marked settled."
        : isPayer
          ? "Recorded — the share was added back to your budget as a refund."
          : "Recorded — your share was added to your expenses.")
      load()
    } catch (e) {
      console.error(e)
      setSettledNote("Couldn't record the settlement. Try again.")
    } finally {
      setSettling(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!split) return (
    <div className="py-12 text-center space-y-4">
      <p className="text-news">This split doesn't exist, or you don't have access to it.</p>
      <Button variant="secondary" className="rounded-md" onClick={() => navigate(`/groups/${groupId}`)}>Back to group</Button>
    </div>
  )

  const allSettled = split.participants.every((p) => p.status === "settled")

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/groups/${groupId}`)} aria-label="Back to group">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-sans font-bold text-ink">{split.merchant}</h1>
          <p className="text-news text-sm">{split.date} · Total: {currencySymbol}{split.totalAmount.toFixed(2)}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Shares
            <span className={`text-xs px-2 py-0.5 rounded-full font-normal ${allSettled ? "bg-green-100 text-green-700" : "bg-ink/10 text-news"}`}>
              {allSettled ? "Fully Settled" : "Pending"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-border">
          {split.participants.map((p) => {
            const isMe = p.userId === user.uid
            const isPayer = p.userId === split.payerId
            const settled = p.status === "settled"
            // New splits mark the payer's own share settled at creation; older ones can still be ticked (no money moves)
            const canSettle = (isMe || user.uid === split.payerId) && !settled

            return (
              <div key={p.userId} className="flex items-center gap-3 py-3">
                {p.photoURL
                  ? <img src={p.photoURL} referrerPolicy="no-referrer" loading="lazy" alt={p.displayName} className="w-8 h-8 rounded-full" />
                  : <div className="w-8 h-8 rounded-full bg-ink/10 flex items-center justify-center text-xs font-bold">{(p.displayName || "?")[0]}</div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">
                    {p.displayName}
                    {isMe && <span className="text-news ml-1">(you)</span>}
                    {isPayer && <span className="text-news ml-1">· payer</span>}
                  </p>
                  <p className="text-xs font-mono text-ink mt-0.5">{currencySymbol}{p.amount.toFixed(2)}</p>
                </div>
                {settled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                ) : canSettle ? (
                  <Button size="sm" variant="outline" disabled={settling} onClick={() => handleSettle(p.userId)}>
                    Mark Settled
                  </Button>
                ) : (
                  <span className="text-xs bg-ink/10 text-news px-2 py-0.5 rounded-full">Pending</span>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {settledNote && (
        <p role="status" className={`text-sm ${settledNote.startsWith("Couldn't") ? "text-red-500" : "text-green-600"}`}>{settledNote}</p>
      )}
    </div>
  )
}
