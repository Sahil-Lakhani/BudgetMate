import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Input } from "../components/Input"
import { Badge } from "../components/Badge"
import { Search, Filter, ChevronDown, ChevronUp, ShoppingBasket, Shirt, Smartphone, Coffee, Utensils, Car, Home, Zap, Tag } from "lucide-react"
import { Button } from "../components/Button"
import { useAuth } from "../context/AuthContext"
import { getUserTransactions } from "../lib/firestore"

export default function Expenses() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedId, setExpandedId] = useState(null)
  const [filterCategory, setFilterCategory] = useState("All")

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

  const filteredTransactions = transactions.filter((t) => {
    // Determine category for filtering (use first line item or general)
    const category = t.lineItems?.[0]?.category || "General"

    const matchesSearch = t.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === "All" || category === filterCategory
    return matchesSearch && matchesCategory
  })

  // Extract unique categories from all transactions' line items
  const categories = ["All", ...new Set(transactions.flatMap(t => t.lineItems?.map(i => i.category) || []))]

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id)
  }

  if (loading) {
    return <div className="p-8 text-center text-news">Loading expenses...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold mb-2 text-ink">Expenses</h2>
        <p className="text-news">Manage your transaction history.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-news" />
          <Input
            className="pl-10"
            placeholder="Search merchant or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
          {categories.slice(0, 5).map(cat => ( // Limit to 5 categories for UI
            <Button
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

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="border-2 border-transparent hover:border-news-light transition-colors bg-card pt-2 pb-2 cursor-pointer rounded-lg"
                  onClick={() => toggleExpand(transaction.id)}
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
                      <span className="font-bold font-serif text-ink">-${parseFloat(transaction.total).toFixed(2)}</span>
                      {expandedId === transaction.id ? <ChevronUp className="h-4 w-4 text-ink" /> : <ChevronDown className="h-4 w-4 text-ink" />}
                    </div>
                  </div>

                  {expandedId === transaction.id && (
                    <div className="mt-4 pt-4 border-t border-news-light/20 space-y-4 animate-in slide-in-from-top-2">

                      {/* Line Items Table */}
                      {transaction.lineItems && transaction.lineItems.length > 0 && (
                        <div className="pr-6 mr-2 pl-6 ml-8">
                          <p className="text-xs font-medium text-news mb-2 uppercase tracking-wider">Items</p>
                          <div className="space-y-2">
                            {transaction.lineItems.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <div>
                                  <span className="text-ink font-medium">{item.name}</span>
                                  <span className="text-news text-xs ml-2">x{item.quantity}</span>
                                </div>
                                <span className="text-ink">${parseFloat(item.totalPrice).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-news text-xs">Status</p>
                          <Badge variant="secondary" className="mt-1">Completed</Badge>
                        </div>
                        <div>
                          <p className="text-news text-xs">Transaction ID</p>
                          <p className="font-mono mt-1 text-xs truncate">{transaction.id}</p>
                        </div>
                      </div> */}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-news">
                No transactions found.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
