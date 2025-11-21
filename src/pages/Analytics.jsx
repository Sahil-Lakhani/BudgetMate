import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useTheme } from "../context/ThemeContext"

const monthlyData = [
  { name: "Jan", total: 1200 },
  { name: "Feb", total: 1900 },
  { name: "Mar", total: 1500 },
  { name: "Apr", total: 2100 },
  { name: "May", total: 1800 },
  { name: "Jun", total: 2350 },
]

const topCategories = [
  { name: "Food & Dining", amount: 850, count: 45, trend: "+12%" },
  { name: "Transportation", amount: 420, count: 28, trend: "-5%" },
  { name: "Shopping", amount: 350, count: 12, trend: "+8%" },
  { name: "Entertainment", amount: 200, count: 8, trend: "+2%" },
  { name: "Bills & Utilities", amount: 180, count: 4, trend: "0%" },
]

export default function Analytics() {
  const { theme } = useTheme()
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-serif font-bold mb-2 text-ink">Analytics</h2>
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
                  tickFormatter={(value) => `$${value}`} 
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
            <div className="space-y-4">
              {topCategories.map((cat, idx) => (
                <div key={cat.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-serif font-bold text-news-light">{idx + 1}</span>
                    <div>
                      <p className="font-medium">{cat.name}</p>
                      <p className="text-xs text-news">{cat.count} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-serif">${cat.amount}</p>
                    <p className={`text-xs ${cat.trend.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>
                      {cat.trend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-news-light/20 border border-news-light">
              <h4 className="font-bold font-serif mb-1">Spending Alert</h4>
              <p className="text-sm text-news">Your food spending is 12% higher than last month. Consider cooking at home more often.</p>
            </div>
            <div className="p-4 bg-news-light/20 border border-news-light">
              <h4 className="font-bold font-serif mb-1">Savings Opportunity</h4>
              <p className="text-sm text-news">You could save approx. $50/month by switching your streaming subscriptions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
