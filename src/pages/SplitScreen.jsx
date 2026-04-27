import { useEffect, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, createSplit, createNotification } from "../lib/firestore"
import { SplitRow } from "../components/SplitRow"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Loader2, ArrowLeft } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

function distributeEvenly(total, count) {
  if (count === 0) return []
  const base = Math.floor((total * 100) / count) / 100
  const remainder = Math.round((total - base * count) * 100) / 100
  return Array.from({ length: count }, (_, i) => (i === 0 ? base + remainder : base))
}

export default function SplitScreen() {
  usePageTitle("Split")
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const { merchant, totalAmount, date } = location.state || {}

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [active, setActive] = useState({})
  const [amounts, setAmounts] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!groupId) return
    getGroup(groupId).then((g) => {
      setGroup(g)
      if (g) {
        const initialActive = {}
        g.members.forEach((m) => { initialActive[m.userId] = true })
        setActive(initialActive)

        const shares = distributeEvenly(totalAmount, g.members.length)
        const initialAmounts = {}
        g.members.forEach((m, i) => { initialAmounts[m.userId] = shares[i] })
        setAmounts(initialAmounts)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [groupId, totalAmount])

  const activeMembers = group?.members.filter((m) => active[m.userId]) || []
  const assigned = activeMembers.reduce((sum, m) => sum + (amounts[m.userId] || 0), 0)
  const diff = Math.round((totalAmount - assigned) * 100) / 100
  const isValid = Math.abs(diff) < 0.005

  const handleToggle = (userId) => {
    const nextActive = { ...active, [userId]: !active[userId] }
    const nowActive = group.members.filter((m) => nextActive[m.userId])
    if (nowActive.length === 0) return

    const shares = distributeEvenly(totalAmount, nowActive.length)
    const nextAmounts = { ...amounts }
    nowActive.forEach((m, i) => { nextAmounts[m.userId] = shares[i] })
    setActive(nextActive)
    setAmounts(nextAmounts)
  }

  const handleAmountChange = (userId, value) => {
    setAmounts((prev) => ({ ...prev, [userId]: value }))
  }

  const handleConfirm = async () => {
    if (!isValid) return
    setSaving(true)
    setError("")
    try {
      const participants = group.members
        .filter((m) => active[m.userId])
        .map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          photoURL: m.photoURL || "",
          amount: amounts[m.userId],
          status: "pending"
        }))

      const { splitId } = await createSplit(groupId, user.uid, {
        merchant,
        date,
        totalAmount,
        participants
      })

      await Promise.all(
        participants
          .filter((p) => p.userId !== user.uid)
          .map((p) =>
            createNotification(p.userId, {
              type: "split_added",
              splitId,
              groupId,
              groupName: group.name,
              payerName: user.displayName || user.email,
              merchant,
              amount: p.amount
            })
          )
      )

      navigate(`/groups/${groupId}`)
    } catch (e) {
      console.error(e)
      setError("Failed to save split. Try again.")
      setSaving(false)
    }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-news" /></div>
  if (!group || !merchant || !totalAmount) return (
    <div className="space-y-4">
      <p className="text-news">Missing split data. Go back and try again.</p>
      <Button onClick={() => navigate(`/groups/${groupId}`)}>Back to Group</Button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-serif font-bold text-ink">Split Bill</h1>
          <p className="text-news text-sm">{merchant} · {currencySymbol}{totalAmount?.toFixed(2)}</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Assign Shares</CardTitle></CardHeader>
        <CardContent>
          {group.members.map((m) => (
            <SplitRow
              key={m.userId}
              participant={m}
              amount={amounts[m.userId] || 0}
              isActive={!!active[m.userId]}
              isLastActive={activeMembers.length === 1 && active[m.userId]}
              onToggle={() => handleToggle(m.userId)}
              onAmountChange={(val) => handleAmountChange(m.userId, val)}
              currencySymbol={currencySymbol}
            />
          ))}
        </CardContent>
      </Card>

      <div className={`flex items-center justify-between px-4 py-3 rounded-md font-medium text-sm ${isValid ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-600"}`}>
        <span>Assigned</span>
        <span>
          {currencySymbol}{assigned.toFixed(2)} / {currencySymbol}{totalAmount.toFixed(2)}
          {!isValid && ` (${diff > 0 ? `-${Math.abs(diff).toFixed(2)}` : `+${Math.abs(diff).toFixed(2)}`} remaining)`}
        </span>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button
        className="w-full"
        disabled={!isValid || saving}
        onClick={handleConfirm}
      >
        {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Confirm Split"}
      </Button>
    </div>
  )
}
