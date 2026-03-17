import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import Insights from "../components/Insights"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { ArrowDownRight, DollarSign, TrendingUp } from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { CURRENCIES, getCurrencySymbol } from "../lib/currency"
import { Select } from "../components/Select"
import { getUserTransactions, getUserSettings, updateUserSettings } from "../lib/firestore"
import { X } from "lucide-react"
import { Link } from "react-router-dom"

const COLORS = {
  light: ["#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#3B82F6", "#EC4899", "#6366F1"],
  dark: ["#A78BFA", "#34D399", "#FBBF24", "#F87171", "#60A5FA", "#F472B6", "#818CF8"]
}

export default function Dashboard() {
  const { theme } = useTheme()
  const { user } = useAuth()
  const { currency, setCurrency, formatCurrency } = useCurrency()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
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
  const [modalStep, setModalStep] = useState(1)
  const [modalError, setModalError] = useState("")
  const [tempSettings, setTempSettings] = useState({
    currency: 'EUR',
    income: "",
    savingsType: "percentage",
    savingsValue: ""
  })

  const fetchData = async () => {
    if (!user?.uid) return
    setLoading(true)
    setError(null)
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
    } catch (err) {
      console.error("Error loading dashboard data:", err)
      setError("Failed to load your data. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  // Sync modal currency with context currency when modal opens
  useEffect(() => {
    if (showSettingsModal) {
      setTempSettings(prev => ({ ...prev, currency }))
      setModalStep(1)
      setModalError("")
    }
  }, [showSettingsModal])

  const calculateStats = (data, settings) => {
    const now = new Date()
    const currentMonth = now.toISOString().slice(0, 7)
    const currentYear = now.getFullYear()

    let monthlyTotal = 0
    let yearlyTotal = 0
    const categoryTotals = {}

    data.forEach(t => {
      const amount = parseFloat(t.total || 0)
      const date = new Date(t.date)

      if (date.getFullYear() === currentYear) yearlyTotal += amount
      if (t.date.startsWith(currentMonth)) monthlyTotal += amount

      if (t.lineItems && Array.isArray(t.lineItems)) {
        t.lineItems.forEach(item => {
          const itemTotal = parseFloat(item.totalPrice || 0)
          const cat = item.category || "Other"
          categoryTotals[cat] = (categoryTotals[cat] || 0) + itemTotal
        })
      } else {
        const cat = t.category || "Other"
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amount
      }
    })

    let highestCategory = { name: "N/A", value: 0 }
    Object.entries(categoryTotals).forEach(([name, value]) => {
      if (value > highestCategory.value) highestCategory = { name, value }
    })

    const daysPassed = now.getDate()
    const dailyAverage = daysPassed > 0 ? monthlyTotal / daysPassed : 0

    let income = 0, savingsGoal = 0, savingsAmount = 0, spendableAmount = 0, remainingSpendable = 0

    if (settings && settings.income) {
      income = parseFloat(settings.income)
      const savingsValue = parseFloat(settings.savingsValue || 0)

      if (settings.savingsType === 'percentage') {
        savingsAmount = (income * savingsValue) / 100
        savingsGoal = savingsValue
      } else {
        savingsAmount = savingsValue
        savingsGoal = savingsValue
      }

      spendableAmount = income - savingsAmount
      remainingSpendable = spendableAmount - monthlyTotal
    }

    setStats({ monthlyTotal, yearlyTotal, highestCategory, dailyAverage, income, savingsAmount, spendableAmount, remainingSpendable })

    const newChartData = Object.entries(categoryTotals).map(([name, value], index) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5)

    setChartData(newChartData)
  }

  useEffect(() => {
    if (chartData.length > 0) {
      setChartData(prev => prev.map((item, index) => ({
        ...item,
        color: theme === 'dark' ? COLORS.dark[index % COLORS.dark.length] : COLORS.light[index % COLORS.light.length]
      })))
    }
  }, [theme])

  const handleSaveSettings = async () => {
    const incomeVal = parseFloat(tempSettings.income)
    const savingsVal = parseFloat(tempSettings.savingsValue)

    if (!incomeVal || incomeVal <= 0) {
      setModalError("Please enter a valid income greater than 0.")
      return
    }
    if (!savingsVal || savingsVal <= 0) {
      setModalError("Please enter a valid savings goal greater than 0.")
      return
    }

    try {
      await updateUserSettings(user.uid, tempSettings)
      setCurrency(tempSettings.currency) // sync context state (no extra Firestore write)
      setShowSettingsModal(false)
      calculateStats(transactions, tempSettings)
    } catch (err) {
      setModalError("Failed to save settings. Please try again.")
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-news">Loading dashboard...</div>
  }

  if (error) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-70 transition"
        >
          Retry
        </button>
      </div>
    )
  }

  const currencySymbol = getCurrencySymbol(tempSettings.currency)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-sans font-bold mb-1 text-ink">Financial Overview</h2>
        <p className="text-sm text-news">Your daily financial digest.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2">
        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">Monthly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">
              {stats.income > 0 ? (
                formatCurrency(stats.income)
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
            <CardTitle className="text-sm font-medium font-sans text-news">Monthly Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">{formatCurrency(stats.savingsAmount)}</div>
            <p className="text-xs text-news mt-1">Target savings</p>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">Remaining Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className={`text-2xl font-bold font-sans ${stats.remainingSpendable < 0 ? 'text-red-500' : 'text-ink'}`}>
              {formatCurrency(stats.remainingSpendable)}
            </div>
            <p className="text-xs text-news mt-1">After savings & expenses</p>
          </CardContent>
        </Card>

        <Card className="p-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-0 mb-2 border-0">
            <CardTitle className="text-sm font-medium font-sans text-news">Monthly Spent</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-ink" />
          </CardHeader>
          <CardContent className="p-0">
            <div className="text-2xl font-bold font-sans text-ink">{formatCurrency(stats.monthlyTotal)}</div>
            <p className="text-xs text-news mt-1">{new Date().toLocaleString('en-US', { month: 'long' })} expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Onboarding / Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 w-full max-w-md shadow-xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-bold text-ink">
                {modalStep === 1 ? "Welcome to BudgetMate" : "Setup Your Budget"}
              </h3>
              <button onClick={() => setShowSettingsModal(false)} className="text-news hover:text-ink">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Progress indicator */}
            <p className="text-xs text-news mb-5">Step {modalStep} of 2</p>
            <div className="flex gap-2 mb-6">
              <div className="flex-1 h-1 rounded-full bg-ink" />
              <div className={`flex-1 h-1 rounded-full ${modalStep === 2 ? 'bg-ink' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
            </div>

            {modalStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-news">Choose your preferred currency. You can change this later in Settings.</p>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Currency</label>
                  <Select
                    value={tempSettings.currency}
                    onChange={(e) => setTempSettings({ ...tempSettings, currency: e.target.value })}
                    options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
                  />
                </div>
                <button
                  onClick={() => { setModalError(""); setModalStep(2) }}
                  className="w-full bg-ink text-paper py-2 rounded-md font-medium hover:opacity-70 transition-colors mt-2"
                >
                  Next →
                </button>
              </div>
            )}

            {modalStep === 2 && (
              <div className="space-y-4">
                <p className="text-sm text-news">Enter your monthly income and savings goal to calculate your budget.</p>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Monthly Income ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tempSettings.income}
                    onChange={(e) => setTempSettings({ ...tempSettings, income: e.target.value })}
                    className="w-full p-2 rounded-md border border-border bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                    placeholder={`e.g. ${currencySymbol} 3000`}
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
                      Fixed Amount ({currencySymbol})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={tempSettings.savingsValue}
                    onChange={(e) => setTempSettings({ ...tempSettings, savingsValue: e.target.value })}
                    className="w-full p-2 rounded-md border border-border bg-transparent text-ink focus:outline-none focus:ring-2 focus:ring-ink"
                    placeholder={tempSettings.savingsType === 'percentage' ? "e.g. 20" : `e.g. ${currencySymbol} 500`}
                  />
                </div>

                {modalError && <p className="text-sm text-red-500">{modalError}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setModalError(""); setModalStep(1) }}
                    className="flex-1 border border-border text-ink py-2 rounded-md text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="flex-1 bg-ink text-paper py-2 rounded-md font-medium hover:opacity-70 transition-colors"
                  >
                    Save & Calculate
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Insights Section */}
      <Insights transactions={transactions} />

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7 md:h-[calc(100vh-280px)] md:min-h-[300px]">
        {/* Visual Breakdown */}
        <Card className="col-span-1 lg:col-span-4 flex flex-col">
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
                        formatter={(value) => formatCurrency(value)}
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
        <Card className="col-span-1 lg:col-span-3 flex flex-col">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto pr-6">
            <div className="space-y-3">
              {transactions.length > 0 ? (
                transactions.slice(0, 7).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium leading-none text-ink">{transaction.merchant}</p>
                      <p className="text-xs text-news">
                        {transaction.lineItems?.[0]?.category || "General"} • {transaction.date}
                      </p>
                    </div>
                    <div className="font-bold font-sans text-ink text-sm">
                      -{formatCurrency(parseFloat(transaction.total))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 space-y-3">
                  <p className="text-news">No recent transactions.</p>
                  <Link
                    to="/expenses/add"
                    className="inline-block px-4 py-2 bg-ink text-paper rounded-md text-sm font-medium hover:opacity-70 transition"
                  >
                    Add your first transaction
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
