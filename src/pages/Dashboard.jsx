import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { getUserTransactions } from "../lib/firestore"

const COLORS = {
  light: ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#6366F1"],
  dark: ["#A78BFA", "#34D399", "#FBBF24", "#F87171", "#60A5FA", "#F472B6", "#818CF8"]
}

export default function Dashboard() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    monthlyTotal: 0,
    yearlyTotal: 0,
    highestCategory: { name: "N/A", value: 0 },
    dailyAverage: 0
  })
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          const data = await getUserTransactions(user.uid)
          setTransactions(data)
          calculateStats(data)
        } catch (error) {
          console.error("Error loading dashboard data:", error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [user])

  const calculateStats = (data) => {
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM
    const currentYear = now.getFullYear()

    let monthlyTotal = 0
    let yearlyTotal = 0
    const categoryTotals = {}

    data.forEach(t => {
      const amount = parseFloat(t.total || 0)
      const date = new Date(t.date)

      // Yearly Total
      if (date.getFullYear() === currentYear) {
        yearlyTotal += amount
      }

      // Monthly Total
      if (t.date.startsWith(currentMonth)) {
        monthlyTotal += amount
      }

      // Category Totals
      // Use main category or infer from line items if needed. 
      // Assuming 'category' field exists on transaction or we aggregate line items.
      // The user example shows 'lineItems' have categories. 
      // Let's aggregate from line items if available, or fallback to a transaction level category if we add one later.
      // For now, let's assume we iterate line items for categories.
      if (t.lineItems && Array.isArray(t.lineItems)) {
        t.lineItems.forEach(item => {
          const itemTotal = parseFloat(item.totalPrice || 0)
          const cat = item.category || "Other"
          categoryTotals[cat] = (categoryTotals[cat] || 0) + itemTotal
        })
      } else {
        // Fallback if no line items but transaction has category (future proofing)
        const cat = t.category || "Other"
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount
      }
    })

    // Highest Category
    let highestCategory = { name: "N/A", value: 0 }
    Object.entries(categoryTotals).forEach(([name, value]) => {
      if (value > highestCategory.value) {
        highestCategory = { name, value }
      }
    })

    // Daily Average (Simple: Monthly Total / Days passed in month)
    const daysPassed = now.getDate()
    const dailyAverage = daysPassed > 0 ? monthlyTotal / daysPassed : 0

    setStats({
      monthlyTotal,
      yearlyTotal,
      highestCategory,
      dailyAverage
    })

    // Chart Data
    const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5) // Top 5 categories

    setChartData(newChartData)
  }

  // Recalculate chart colors if theme changes
  useEffect(() => {
    if (chartData.length > 0) {
      setChartData(prev => prev.map((item, index) => ({
        ...item,
        color: theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]
      })))
    }
  }, [theme])

  if (loading) {
    return <div className="p-8 text-center text-news">Loading dashboard...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-sans font-bold mb-1 text-ink">Financial Overview</h2>
        <p className="text-sm text-news">Your daily financial digest.</p>
      </div>

      {/* Real-Time Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Monthly Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">€{stats.monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-news mt-1">Current month spending</p>
          </CardContent>
        </Card>
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Yearly Total
            </CardTitle>
            <Calendar className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">€{stats.yearlyTotal.toFixed(2)}</div>
            <p className="text-xs text-news mt-1">Year to date</p>
          </CardContent>
        </Card>
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Highest Category
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink truncate">{stats.highestCategory.name}</div>
            <p className="text-xs text-news mt-1">€{stats.highestCategory.value.toFixed(2)} this month</p>
          </CardContent>
        </Card>
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Daily Average
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">€{stats.dailyAverage.toFixed(2)}</div>
            <p className="text-xs text-news mt-1">This month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 md:h-[calc(100vh-280px)] md:min-h-[300px]">
        {/* Visual Breakdown */}
        <Card className="col-span-4 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 flex flex-col justify-center">
            {chartData.length > 0 ? (
              <>
                <div className="h-[250px] md:h-full w-full min-h-[150px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#171717' : '#fff',
                          borderColor: theme === 'dark' ? '#262626' : '#1A1A1A',
                          borderRadius: '8px',
                          color: theme === 'dark' ? '#EDEDED' : '#1A1A1A'
                        }}
                        itemStyle={{ color: theme === 'dark' ? '#EDEDED' : '#1A1A1A', fontFamily: 'Inter' }}
                        formatter={(value) => `€${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-4 mt-2">
                  {chartData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-news">{item.name}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-news">
                No spending data available.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="col-span-3 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pr-6">
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.slice(0, 10).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none text-ink">{transaction.merchant}</p>
                      <p className="text-xs text-news">
                        {/* Show first category or 'Mixed' */}
                        {transaction.lineItems?.[0]?.category || "General"} • {transaction.date}
                      </p>
                    </div>
                    <div className="font-bold font-sans text-ink text-sm">
                      -€{parseFloat(transaction.total).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-news">
                  No recent transactions.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
