import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Calendar } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { getUserTransactions, getUserSettings, updateUserSettings } from "../lib/firestore"
import { X } from "lucide-react"

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
    monthlyTotal: 0,
    yearlyTotal: 0,
    highestCategory: { name: "N/A", value: 0 },
    dailyAverage: 0,
    income: 0,
    savingsGoal: 0,
    savingsAmount: 0,
    spendableAmount: 0,
    remainingSpendable: 0
  })
  const [chartData, setChartData] = useState([])
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [tempSettings, setTempSettings] = useState({
    income: "",
    savingsType: "percentage", // or "fixed"
    savingsValue: ""
  })

  useEffect(() => {
    const fetchData = async () => {
      if (user?.uid) {
        try {
          const [data, settings] = await Promise.all([
            getUserTransactions(user.uid),
            getUserSettings(user.uid)
          ])

          if (!settings || !settings.income) {
            setShowSettingsModal(true)
          }

          setTransactions(data)
          calculateStats(data, settings)
        } catch (error) {
          console.error("Error loading dashboard data:", error)
        } finally {
          setLoading(false)
        }
      }
    }
    fetchData()
  }, [user])

  const calculateStats = (data, settings) => {
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


    // Income & Savings Logic
    let income = 0
    let savingsGoal = 0
    let savingsAmount = 0
    let spendableAmount = 0
    let remainingSpendable = 0

    if (settings && settings.income) {
      income = parseFloat(settings.income)
      const savingsValue = parseFloat(settings.savingsValue || 0)

      if (settings.savingsType === 'percentage') {
        savingsAmount = (income * savingsValue) / 100
        savingsGoal = savingsValue // Store percentage for display if needed
      } else {
        savingsAmount = savingsValue
        savingsGoal = savingsValue
      }

      spendableAmount = income - savingsAmount
      remainingSpendable = spendableAmount - monthlyTotal
    }

    setStats({
      monthlyTotal,
      yearlyTotal,
      highestCategory,
      dailyAverage,
      income,
      savingsAmount,
      spendableAmount,
      remainingSpendable
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
      {/* Real-Time Stats */}
      <div className="grid gap-4 grid-cols-2">
        {/* Row 1: Monthly Income, Monthly Savings */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Monthly Income
            </CardTitle>
            <DollarSign className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">
              {stats.income > 0 ? (
                `€${stats.income.toFixed(2)}`
              ) : (
                <button
                  onClick={() => setShowSettingsModal(true)}
                  className="w-full text-sm font-medium text-ink border border-border rounded px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Set
                </button>
              )}
            </div>
            <p className="text-xs text-news mt-1">Total monthly earnings</p>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Monthly Savings
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">
              €{stats.savingsAmount.toFixed(2)}
            </div>
            <p className="text-xs text-news mt-1">Target savings</p>
          </CardContent>
        </Card>

        {/* Row 2: Remaining Spendable, Yearly Total */}
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Remaining Budget
            </CardTitle>
            <DollarSign className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className={`text-2xl font-bold font-sans ${stats.remainingSpendable < 0 ? 'text-red-500' : 'text-ink'}`}>
              €{stats.remainingSpendable.toFixed(2)}
            </div>
            <p className="text-xs text-news mt-1">After savings & expenses</p>
          </CardContent>
        </Card>

        {/* <Card className="p-4">
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
        </Card> */}

        {/* Row 3: Spendable Amount */}
        {/* <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Spendable Budget
            </CardTitle>
            <ArrowUpRight className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">€{stats.spendableAmount.toFixed(2)}</div>
            <p className="text-xs text-news mt-1">Income minus savings</p>
          </CardContent>
        </Card> */}

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">
              Monthly Spent
            </CardTitle>
            <ArrowDownRight className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">€{stats.monthlyTotal.toFixed(2)}</div>
            <p className="text-xs text-news mt-1">{new Date().toLocaleString('en-US', { month: 'long' })} expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-ink">Setup Your Budget</h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-news hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-news mb-6">
              Please enter your monthly income and savings goal to calculate your budget.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Monthly Income (€)</label>
                <input
                  type="number"
                  value={tempSettings.income}
                  onChange={(e) => setTempSettings({ ...tempSettings, income: e.target.value })}
                  className="w-full p-2 rounded-md border border-border bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                  placeholder="e.g. € 3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-ink mb-1">Savings Goal</label>
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={() => setTempSettings({ ...tempSettings, savingsType: 'percentage' })}
                    className={`flex-1 py-1 px-2 text-xs rounded-md border ${tempSettings.savingsType === 'percentage' ? 'bg-ink text-paper border-ink' : 'border-border text-news'}`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    onClick={() => setTempSettings({ ...tempSettings, savingsType: 'fixed' })}
                    className={`flex-1 py-1 px-2 text-xs rounded-md border ${tempSettings.savingsType === 'fixed' ? 'bg-ink text-paper border-ink' : 'border-border text-news'}`}
                  >
                    Fixed Amount (€)
                  </button>
                </div>
                <input
                  type="number"
                  value={tempSettings.savingsValue}
                  onChange={(e) => setTempSettings({ ...tempSettings, savingsValue: e.target.value })}
                  className="w-full p-2 rounded-md border border-border bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                  placeholder={tempSettings.savingsType === 'percentage' ? "e.g. 20%" : "e.g. € 500"}
                />
              </div>

              <button
                onClick={async () => {
                  if (!tempSettings.income || !tempSettings.savingsValue) return
                  try {
                    await updateUserSettings(user.uid, tempSettings)
                    setShowSettingsModal(false)
                    // Refresh stats
                    calculateStats(transactions, tempSettings)
                  } catch (error) {
                    console.error("Failed to save settings", error)
                  }
                }}
                className="w-full bg-ink text-paper py-2 rounded-md font-medium hover:opacity-70 transition-colors mt-2"

              >
                Save & Calculate
              </button>
            </div>
          </div>
        </div>
      )}

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
