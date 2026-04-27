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
  usePageTitle("Split")
  const { groupId, splitId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [split, setSplit] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settling, setSettling] = useState(false)

  const load = () => {
    getSplit(splitId)
      .then(setSplit)
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [splitId])

  const handleSettle = async (targetUserId) => {
    setSettling(true)
    try {
      await settleSplit(splitId, targetUserId)
      load()
    } catch (e) {
      console.error(e)
    } finally {
      setSettling(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!split) return <p className="text-news">Split not found.</p>

  const allSettled = split.participants.every((p) => p.status === "settled")

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/groups/${groupId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">{split.merchant}</h1>
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
            const canSettle = (isMe || user.uid === split.payerId) && !settled

            return (
              <div key={p.userId} className="flex items-center gap-3 py-3">
                {p.photoURL
                  ? <img src={p.photoURL} alt={p.displayName} className="w-8 h-8 rounded-full" />
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
    </div>
  )
}
