import { useState, useEffect } from "react"
import { Card, CardContentTransaction, CardHeader, CardTitle } from "../components/Card"
import { Input } from "../components/Input"
import { Badge } from "../components/Badge"
import { Search, Filter, ChevronRight, ShoppingBasket, Shirt, Smartphone, Coffee, Utensils, Car, Home, Zap, Tag } from "lucide-react"
import { Button } from "../components/Button"
import { useAuth } from "../context/AuthContext"
import { getUserTransactions } from "../lib/firestore"
import { useNavigate } from "react-router-dom"

export default function Expenses() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterCategory, setFilterCategory] = useState("All")

  // Initialize with current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          const data = await getUserTransactions(user.uid)
          setTransactions(data)
        } catch (error) {
          console.error("Error loading expenses:", error)
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

  // Get unique months from transactions + current month
  const availableMonths = [...new Set([
    currentMonth,
    ...transactions.map(t => t.date.slice(0, 7))
  ])].sort().reverse()

  const filteredTransactions = transactions.filter((t) => {
    // Determine category for filtering (use first line item or general)
    const category = t.lineItems?.[0]?.category || "General"

    const matchesSearch = t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "All" || category === filterCategory
    const matchesMonth = t.date.startsWith(selectedMonth)

    return matchesSearch && matchesCategory && matchesMonth
  })

  // Extract unique categories from all transactions' line items
  const categories = ["All", ...new Set(transactions.flatMap(t => t.lineItems?.map(i => i.category) || []))]

  if (loading) {
    return <div className="p-8 text-center text-news">Loading expenses...</div>
  }

  return (
    <div className="space-y-3">
      {/* <div>
        <h2 className="text-3xl font-serif font-bold text-ink text-center">Expenses</h2>
        <p className="text-news">Manage your transaction history.</p>
      </div> */}

      {/* Monthly Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {availableMonths.map(month => {
          const date = new Date(month + "-01")
          const label = date.toLocaleDateString('default', { month: 'long', year: 'numeric' })
          return (
            <Button
              key={month}
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
            className="pl-10 rounded-[8px]"
            placeholder="Search merchant or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {categories.slice(0, 5).map(cat => ( // Limit to 5 categories for UI
            <Button
              className="rounded-[8px]"
              key={cat}
              variant={filterCategory === cat ? "primary" : "secondary"}
              size="sm"
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Monthly Total */}
      <div className="bg-card p-3 rounded-lg border border-border flex justify-between items-center shadow-sm">
        <div>
          <p className="text-sm text-news font-medium">Total Expenses</p>
          <p className="text-xs text-news/60">{new Date(selectedMonth + "-01").toLocaleDateString('default', { month: 'long', year: 'numeric' })}</p>
        </div>
        <p className="text-2xl font-bold text-ink">
          €{filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0).toFixed(2)}
        </p>
      </div>

      <Card>
        <CardContentTransaction>
          <div className="space-y-2 my-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="bg-card  cursor-pointer rounded-lg"
                  onClick={() => navigate(`/expenses/${transaction.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-news-light/20 flex items-center justify-center rounded-full">
                        {getCategoryIcon(transaction.lineItems?.[0]?.category || "General")}
                      </div>
                      <div>
                        <p className="font-bold text-ink">{transaction.merchant}</p>
                        <p className="text-xs text-news">
                          {transaction.date} • {transaction.lineItems?.[0]?.category || "General"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-bold text-lg text-ink">- €{parseFloat(transaction.total).toFixed(2)}</span>
                      <ChevronRight className="h-4 w-4 text-ink" />
                    </div>
                  </div>
                  {transaction !== filteredTransactions[filteredTransactions.length - 1] && (
                    <div className="border-b border-gray-500 my-3 mx-2" />
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-news">
                No transactions found for {new Date(selectedMonth + "-01").toLocaleDateString('default', { month: 'long' })}.
              </div>
            )}
          </div>
        </CardContentTransaction>
      </Card>
    </div>
  )
}
