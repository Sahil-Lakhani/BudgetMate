import { useEffect, useState } from "react"
import { useNavigate, useParams, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getGroup, createSplit, createNotification } from "../lib/firestore"
import { SplitRow } from "../components/SplitRow"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Loader2, ArrowLeft, Equal } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

const round2 = (n) => Math.round(n * 100) / 100

// Navigation state is untrusted: the scanner may hand over a string, NaN, a negative,
// or a value with three decimals. Anything that is not a positive amount becomes null,
// which the page treats the same as no data at all.
function normaliseTotal(value) {
  const n = typeof value === "string" ? parseFloat(value) : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return round2(n)
}

// A typed share can only ever be a non-negative amount in whole cents.
function normaliseShare(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return round2(n)
}

// Splits `total` into `count` equal shares; the rounding remainder goes to
// `remainderIndex` (the payer), falling back to the first share.
function distributeEvenly(total, count, remainderIndex = 0) {
  if (count === 0) return []
  const base = Math.floor((total * 100) / count) / 100
  const remainder = round2(total - base * count)
  const target = remainderIndex >= 0 && remainderIndex < count ? remainderIndex : 0
  return Array.from({ length: count }, (_, i) => (i === target ? round2(base + remainder) : base))
}

export default function SplitScreen() {
  usePageTitle("Split")
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const { merchant, date, lineItems } = location.state || {}
  const totalAmount = normaliseTotal(location.state?.totalAmount)

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
      if (g && totalAmount) {
        const initialActive = {}
        g.members.forEach((m) => { initialActive[m.userId] = true })
        setActive(initialActive)

        const payerIndex = g.members.findIndex((m) => m.userId === user.uid)
        const shares = distributeEvenly(totalAmount, g.members.length, payerIndex)
        const initialAmounts = {}
        g.members.forEach((m, i) => { initialAmounts[m.userId] = shares[i] })
        setAmounts(initialAmounts)
      }
    }).catch(console.error).finally(() => setLoading(false))
  }, [groupId, totalAmount, user.uid])

  // The payer must be on the roster: rules require the payer to be a participant, and a
  // member who left (or a stale link) would otherwise fail only at save time.
  const isMember = !!group?.members.some((m) => m.userId === user.uid)

  const activeMembers = group?.members.filter((m) => active[m.userId]) || []
  const assigned = round2(activeMembers.reduce((sum, m) => sum + (amounts[m.userId] || 0), 0))
  const diff = round2((totalAmount || 0) - assigned)
  const isValid = Math.abs(diff) < 0.005

  // Someone left at 0.00 owes nothing, so they are not part of the split — saying so
  // beats sending them a "you owe 0.00" notification.
  const zeroShare = activeMembers.filter((m) => m.userId !== user.uid && !(amounts[m.userId] > 0))

  const splitEqually = (members = activeMembers) => {
    const payerIndex = members.findIndex((m) => m.userId === user.uid)
    const shares = distributeEvenly(totalAmount, members.length, payerIndex)
    setAmounts((prev) => {
      const next = { ...prev }
      members.forEach((m, i) => { next[m.userId] = shares[i] })
      return next
    })
  }

  const handleToggle = (userId) => {
    if (userId === user.uid) return // payer is always a participant
    const nextActive = { ...active, [userId]: !active[userId] }
    const nowActive = group.members.filter((m) => nextActive[m.userId])
    if (nowActive.length === 0) return

    setActive(nextActive)
    splitEqually(nowActive)
  }

  const handleAmountChange = (userId, value) => {
    setAmounts((prev) => ({ ...prev, [userId]: normaliseShare(value) }))
  }

  const handleConfirm = async () => {
    if (!isValid) return
    setSaving(true)
    setError("")
    try {
      const participants = group.members
        .filter((m) => active[m.userId] && (m.userId === user.uid || amounts[m.userId] > 0))
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
        participants,
        lineItems
      })

      // Best-effort fan-out: the split is already saved, so a failed
      // notification must never surface as a save error (or cause a retry/duplicate).
      const results = await Promise.allSettled(
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
      results
        .filter((r) => r.status === "rejected")
        .forEach((r) => console.warn("Notification not sent:", r.reason))

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
  if (!isMember) return (
    <div className="space-y-4">
      <p className="text-news">You're no longer a member of this group, so you can't split a bill in it.</p>
      <Button onClick={() => navigate("/groups")}>Back to Groups</Button>
    </div>
  )

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-sans font-bold text-ink">Split Bill</h1>
          <p className="text-news text-sm">{merchant} · {currencySymbol}{totalAmount?.toFixed(2)}</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Assign Shares</CardTitle>
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => splitEqually()}>
            <Equal className="h-4 w-4" /> Split equally
          </Button>
        </CardHeader>
        <CardContent>
          {group.members.map((m) => (
            <SplitRow
              key={m.userId}
              participant={m}
              amount={amounts[m.userId] || 0}
              isActive={!!active[m.userId]}
              isLastActive={m.userId === user.uid || (activeMembers.length === 1 && active[m.userId])}
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

      {zeroShare.length > 0 && (
        <p className="text-xs text-news">
          {zeroShare.map((m) => m.displayName || m.email || "A member").join(", ")} {zeroShare.length === 1 ? "has" : "have"} a 0.00 share and will be left out of this split.
        </p>
      )}

      <p className="text-xs text-news">
        The full {currencySymbol}{totalAmount.toFixed(2)} is added to your expenses now; each share comes back as a refund when it's settled.
      </p>

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
