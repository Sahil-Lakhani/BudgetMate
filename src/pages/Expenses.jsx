import { localMonth } from "../lib/utils"
import { useState, useEffect } from "react"
import { Card, CardContentTransaction, CardHeader, CardTitle } from "../components/Card"
import { Input } from "../components/Input"
import { Badge } from "../components/Badge"
import { Search, Filter, ChevronRight, ShoppingBasket, Shirt, Smartphone, Coffee, Utensils, Car, Home, Zap, Tag, Plus } from "lucide-react"
import { Button } from "../components/Button"
import { SplitTag } from "../components/SplitTag"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { getUserTransactions } from "../lib/firestore"
import { Link, useNavigate } from "react-router-dom"
import { usePageTitle } from "../lib/usePageTitle"

export default function Expenses() {
  usePageTitle("Expenses")
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")

  // Initialize with current month in YYYY-MM format
  const currentMonth = localMonth()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          const data = await getUserTransactions(user.uid)
          setTransactions(data)
        } catch (error) {
          console.error("Error loading expenses:", error)
          setFetchError("Failed to load transactions. Please check your connection.")
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [user])

  const getCategoryIcon = (category) => {
    const cat = category.toLowerCase()
    if (cat.includes("grocer") || cat.includes("food")) return <ShoppingBasket className="h-5 w-5 text-ink" />
    if (cat.includes("cloth") || cat.includes("wear")) return <Shirt className="h-5 w-5 text-ink" />
    if (cat.includes("electr") || cat.includes("mobile") || cat.includes("phone")) return <Smartphone className="h-5 w-5 text-ink" />
    if (cat.includes("transport") || cat.includes("gas") || cat.includes("fuel") || cat.includes("uber")) return <Car className="h-5 w-5 text-ink" />
    if (cat.includes("home") || cat.includes("rent") || cat.includes("house")) return <Home className="h-5 w-5 text-ink" />
    if (cat.includes("util") || cat.includes("bill") || cat.includes("internet")) return <Zap className="h-5 w-5 text-ink" />
    if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("eat")) return <Utensils className="h-5 w-5 text-ink" />
    if (cat.includes("coffee") || cat.includes("cafe")) return <Coffee className="h-5 w-5 text-ink" />
    return <Tag className="h-5 w-5 text-ink" />
  }

  // "YYYY-MM" → local date (new Date("YYYY-MM-01") is UTC and shows the previous month west of UTC)
  const monthDate = (key) => { const [y, m] = key.split("-").map(Number); return new Date(y, m - 1, 1) }
  const monthLabel = (key, opts = { month: 'long', year: 'numeric' }) => monthDate(key).toLocaleDateString('en', opts)

  // Get unique months from transactions + current month
  const availableMonths = [...new Set([
    currentMonth,
    ...transactions.map(t => t.date.slice(0, 7))
  ])].sort().reverse()

  const filteredTransactions = transactions.filter((t) => {
    // A transaction belongs to every category that any of its line items has
    const itemCategories = (t.lineItems || []).map((i) => i.category).filter(Boolean)
    const term = searchTerm.trim().toLowerCase()

    const matchesSearch = !term ||
      (t.merchant || "").toLowerCase().includes(term) ||
      itemCategories.some((c) => c.toLowerCase().includes(term)) ||
      (t.lineItems || []).some((i) => (i.name || "").toLowerCase().includes(term))
    const matchesCategory = filterCategory === "All" || itemCategories.includes(filterCategory)
    const matchesMonth = t.date.startsWith(selectedMonth)

    return matchesSearch && matchesCategory && matchesMonth
  })

  // Extract unique categories from all transactions' line items
  const categories = ["All", ...new Set(transactions.flatMap(t => t.lineItems?.map(i => i.category).filter(Boolean) || []))]

  if (loading) {
    return <div role="status" className="p-8 text-center text-news">Loading expenses…</div>
  }

  if (fetchError) {
    return <div role="alert" className="p-8 text-center text-red-500">{fetchError}</div>
  }

  return (
    <div className="space-y-3">
      <h1 className="sr-only">Expenses</h1>

      {/* Monthly Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 month-scroll">
        {availableMonths.map(month => {
          const label = monthLabel(month)
          return (
            <Button
              key={month}
              aria-pressed={selectedMonth === month}
              variant={selectedMonth === month ? "primary" : "outline"}
              className="whitespace-nowrap px-6 rounded-[8px]"
              onClick={() => setSelectedMonth(month)}
            >
              {label}
            </Button>
          )
        })}
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-news" />
          <Input
            type="search"
            aria-label="Search expenses"
            className="pl-10 rounded-[8px]"
            placeholder="Search merchant, item or category…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {categories.map(cat => (
            <Button
              className="rounded-[8px] shrink-0"
              key={cat}
              aria-pressed={filterCategory === cat}
              variant={filterCategory === cat ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Monthly Total and Add Transaction */}
      <div className="flex gap-3">
        <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center shadow-sm flex-1">
          <div>
            <p className="text-sm text-news font-medium">Total Expenses</p>
            <p className="text-xs text-news/60">{monthLabel(selectedMonth)}</p>
          </div>
          <p className="text-2xl font-bold text-ink">
            {formatCurrency(filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0))}
          </p>
        </div>
        <Button
          variant="primary"
          className="rounded-lg whitespace-nowrap px-6 h-auto"
          onClick={() => navigate("/expenses/add")}
          aria-label="Add transaction"
        >
          <Plus className="h-6 w-12 md:mr-2" aria-hidden="true" />
          <span className="hidden md:inline">Add Transaction</span>
        </Button>
      </div>

      <Card>
        <CardContentTransaction>
          <div className="space-y-2 my-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div key={transaction.id}>
                  <Link
                    to={`/expenses/${transaction.id}`}
                    className="flex items-center justify-between gap-3 bg-card rounded-lg p-1 -m-1 hover:bg-news-light/20"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-news-light/20 flex items-center justify-center rounded-full">
                        {getCategoryIcon(transaction.lineItems?.[0]?.category || "General")}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-ink">{transaction.merchant}</p>
                          <SplitTag transaction={transaction} />
                        </div>
                        <p className="text-xs text-news">
                          {transaction.date} • {transaction.type === "refund" ? "Refund" : (transaction.lineItems?.[0]?.category || "General")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={`font-bold text-lg ${transaction.type === "refund" ? "text-green-600" : "text-ink"}`}>
                        {transaction.type === "refund" ? "+ " : "- "}{formatCurrency(Math.abs(parseFloat(transaction.total)))}
                      </span>
                      <ChevronRight className="h-4 w-4 text-ink" aria-hidden="true" />
                    </div>
                  </Link>
                  {transaction !== filteredTransactions[filteredTransactions.length - 1] && (
                    <div className="border-b border-gray-500 my-3 mx-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-news">
                {searchTerm || filterCategory !== "All"
                  ? "No transactions match your search."
                  : `No transactions in ${monthLabel(selectedMonth, { month: 'long' })}.`}
              </div>
            )}
          </div>
        </CardContentTransaction>
      </Card>
    </div>
  )
}
