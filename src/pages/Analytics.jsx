import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { getUserTransactions } from "../lib/firestore"

export default function Analytics() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { formatCurrency } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [monthlyData, setMonthlyData] = useState([])
  const [topCategories, setTopCategories] = useState([])
  const [totalTransactions, setTotalTransactions] = useState(0)

  useEffect(() => {
    if (!user?.uid) return
    getUserTransactions(user.uid)
      .then(data => {
        setTotalTransactions(data.length)
        setMonthlyData(computeMonthlyData(data))
        setTopCategories(computeCategories(data))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [user])

  const computeMonthlyData = (data) => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: d.toISOString().slice(0, 7),
        name: d.toLocaleString('en-US', { month: 'short' }),
        total: 0
      })
    }
    data.forEach(t => {
      const monthKey = t.date.slice(0, 7)
      const month = months.find(m => m.key === monthKey)
      if (month) month.total += parseFloat(t.total || 0)
    })
    return months.map(({ name, total }) => ({ name, total: parseFloat(total.toFixed(2)) }))
  }

  const computeCategories = (data) => {
    const categoryTotals = {}
    const categoryCounts = {}
    data.forEach(t => {
      if (t.lineItems && Array.isArray(t.lineItems)) {
        t.lineItems.forEach(item => {
          const cat = item.category || 'Other'
          const amount = parseFloat(item.totalPrice || item.price || 0)
          categoryTotals[cat] = (categoryTotals[cat] || 0) + amount
          categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
        })
      } else {
        const cat = t.category || 'Other'
        categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(t.total || 0)
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
      }
    })
    return Object.entries(categoryTotals)
      .map(([name, amount]) => ({
        name,
        amount: parseFloat(amount.toFixed(2)),
        count: categoryCounts[name] || 0
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
  }

  if (loading) {
    return <div className="p-8 text-center text-news">Loading analytics...</div>
  }

  const currentMonthTotal = monthlyData[monthlyData.length - 1]?.total || 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-sans font-bold mb-2 text-ink">Analytics</h2>
        <p className="text-news">Deep dive into your spending habits.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#262626' : '#E0E0E0'} />
                <XAxis
                  dataKey="name"
                  stroke={theme === 'dark' ? '#A1A1A1' : '#808080'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke={theme === 'dark' ? '#A1A1A1' : '#808080'}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  cursor={{ fill: theme === 'dark' ? '#171717' : '#F0F0F0' }}
                  contentStyle={{
                    backgroundColor: theme === 'dark' ? '#171717' : '#fff',
                    borderColor: theme === 'dark' ? '#262626' : '#1A1A1A',
                    borderRadius: '8px',
                    color: theme === 'dark' ? '#EDEDED' : '#1A1A1A'
                  }}
                  itemStyle={{ color: theme === 'dark' ? '#EDEDED' : '#1A1A1A', fontFamily: 'Inter' }}
                  formatter={(value) => [formatCurrency(value), 'Spent']}
                />
                <Bar dataKey="total" fill={theme === 'dark' ? '#A78BFA' : '#8B5CF6'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-news text-sm">No spending data yet. Add some transactions to see your breakdown.</p>
            ) : (
              <div className="space-y-4">
                {topCategories.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-sans font-bold text-news-light">{idx + 1}</span>
                      <div>
                        <p className="font-medium">{cat.name}</p>
                        <p className="text-xs text-news">{cat.count} transactions</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold font-sans">{formatCurrency(cat.amount)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-news-light/20 border border-news-light">
              <h4 className="font-bold font-sans mb-1">Total Transactions</h4>
              <p className="text-sm text-news">{totalTransactions} transactions recorded</p>
            </div>
            <div className="p-4 bg-news-light/20 border border-news-light">
              <h4 className="font-bold font-sans mb-1">This Month</h4>
              <p className="text-sm text-news">{formatCurrency(currentMonthTotal)} spent</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
