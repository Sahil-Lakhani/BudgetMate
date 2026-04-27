import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { ScanLine, PenLine } from "lucide-react"
import { usePageTitle } from "../lib/usePageTitle"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"

export default function AddSplit() {
  usePageTitle("Add Split")
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const [mode, setMode] = useState(null) // null | "manual"
  const [merchant, setMerchant] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [error, setError] = useState("")

  const handleScan = () => {
    navigate("/scan", { state: { groupId } })
  }

  const handleManualContinue = () => {
    if (!merchant.trim()) { setError("Merchant name is required"); return }
    const total = parseFloat(amount)
    if (!total || total <= 0) { setError("Enter a valid amount"); return }
    navigate(`/groups/${groupId}/split/new/screen`, {
      state: { merchant: merchant.trim(), totalAmount: total, date, fromManual: true }
    })
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-3xl font-serif font-bold text-ink">Add Split</h1>
        <p className="text-news text-sm mt-1">Scan a receipt or enter details manually</p>
      </div>

      {!mode && (
        <div className="grid grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:border-ink/40 transition-colors" onClick={handleScan}>
            <CardContent className="flex flex-col items-center py-10 gap-3">
              <ScanLine className="h-10 w-10 text-ink" />
              <p className="font-medium text-ink">Scan Receipt</p>
              <p className="text-xs text-news text-center">Use camera to extract total automatically</p>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-ink/40 transition-colors" onClick={() => setMode("manual")}>
            <CardContent className="flex flex-col items-center py-10 gap-3">
              <PenLine className="h-10 w-10 text-ink" />
              <p className="font-medium text-ink">Manual Entry</p>
              <p className="text-xs text-news text-center">Enter merchant and amount yourself</p>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === "manual" && (
        <Card>
          <CardHeader><CardTitle>Bill Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Merchant</label>
              <Input placeholder="e.g. Pizza Palace" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Total Amount ({currencySymbol})</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-ink block mb-1">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setMode(null)} className="flex-1">Back</Button>
              <Button onClick={handleManualContinue} className="flex-1">Continue</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
