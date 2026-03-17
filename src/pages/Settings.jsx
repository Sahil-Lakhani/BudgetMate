// TODO: Github and Linkedin icons are deprecated, remove them later.

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Select } from "../components/Select"
import { Input } from "../components/Input"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { CURRENCIES, getCurrencySymbol } from "../lib/currency"
import { getUserSettings, updateUserSettings } from "../lib/firestore"
import { LogOut, Github, Linkedin } from "lucide-react"

export default function Settings() {
  const { user, logout } = useAuth()
  const { currency, updateCurrency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const emptyBudget = { income: "", savingsType: "percentage", savingsValue: "" }
  const [savedBudget, setSavedBudget] = useState(emptyBudget)
  const [budget, setBudget] = useState(emptyBudget)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.uid) return
    getUserSettings(user.uid).then(settings => {
      if (settings) {
        const b = {
          income: settings.income || "",
          savingsType: settings.savingsType || "percentage",
          savingsValue: settings.savingsValue || ""
        }
        setSavedBudget(b)
        setBudget(b)
      }
    }).catch(console.error)
  }, [user])

  const handleBudgetChange = (field, value) => {
    const updated = { ...budget, [field]: value }
    setBudget(updated)
    setDirty(
      updated.income !== savedBudget.income ||
      updated.savingsType !== savedBudget.savingsType ||
      updated.savingsValue !== savedBudget.savingsValue
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateUserSettings(user.uid, budget)
      setSavedBudget(budget)
      setDirty(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setBudget(savedBudget)
    setDirty(false)
  }

  const income = parseFloat(budget.income) || 0
  const savingsVal = parseFloat(budget.savingsValue) || 0
  const savingsAmount = budget.savingsType === "percentage"
    ? (income * savingsVal) / 100
    : savingsVal
  const spendable = income - savingsAmount

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-sans font-bold text-ink">Settings</h2>
        <p className="text-base text-news">Manage your account and preferences.</p>
      </div>

      {user && (
        <>
          {/* Profile */}
          <Card>
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-news-light overflow-hidden flex items-center justify-center shrink-0">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span
                    className="text-sm font-bold text-ink"
                    style={{ display: user.photoURL ? 'none' : 'flex' }}
                  >
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <p className="text-base font-semibold text-ink leading-tight">{user.displayName}</p>
                  <p className="text-sm text-news">{user.email}</p>
                </div>
              </div>
              <Button variant="secondary" size="sm" onClick={logout} className="shrink-0">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          {/* Currency */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Currency</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <Select
                value={currency}
                onChange={(e) => updateCurrency(e.target.value)}
                options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
              />
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Budget</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-3">

              {/* Monthly Income */}
              <div className="space-y-1">
                <label className="text-base font-medium text-ink">Monthly Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-news pointer-events-none">
                    {currencySymbol}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={budget.income}
                    onChange={(e) => handleBudgetChange("income", e.target.value)}
                    className="pl-7 rounded-[8px]"
                    placeholder="e.g. 3000"
                  />
                </div>
              </div>

              {/* Savings Type toggle */}
              <div className="space-y-1">
                <label className="text-base font-medium text-ink">Savings Goal Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleBudgetChange("savingsType", "percentage")}
                    className={`flex-1 py-1.5 px-3 text-sm rounded-[8px] border transition-colors ${
                      budget.savingsType === "percentage"
                        ? "bg-ink text-paper border-ink"
                        : "border-border text-news hover:text-ink"
                    }`}
                  >
                    Percentage (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBudgetChange("savingsType", "fixed")}
                    className={`flex-1 py-1.5 px-3 text-sm rounded-[8px] border transition-colors ${
                      budget.savingsType === "fixed"
                        ? "bg-ink text-paper border-ink"
                        : "border-border text-news hover:text-ink"
                    }`}
                  >
                    Fixed ({currencySymbol})
                  </button>
                </div>
              </div>

              {/* Savings Value */}
              <div className="space-y-1">
                <label className="text-base font-medium text-ink">
                  {budget.savingsType === "percentage" ? "Savings Percentage" : "Savings Amount"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-news pointer-events-none">
                    {budget.savingsType === "percentage" ? "%" : currencySymbol}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    value={budget.savingsValue}
                    onChange={(e) => handleBudgetChange("savingsValue", e.target.value)}
                    className="pl-7 rounded-[8px]"
                    placeholder={budget.savingsType === "percentage" ? "e.g. 20" : "e.g. 600"}
                  />
                </div>
              </div>

              {/* Live summary + actions row */}
              {(income > 0 && savingsAmount > 0 || dirty) && (
                <div className="flex items-center justify-between gap-3">
                  {income > 0 && savingsAmount > 0 ? (
                    <div className="flex-1 px-3 py-2 bg-news-light/20 rounded-[8px] border border-border">
                      <p className="text-base text-news">
                        Saving{" "}
                        <span className="font-medium text-ink">{currencySymbol}{savingsAmount.toFixed(2)}/mo</span>
                        {" · "}
                        <span className="font-medium text-ink">{currencySymbol}{spendable.toFixed(2)}</span>{" "}
                        spendable
                      </p>
                    </div>
                  ) : (
                    <div className="flex-1" />
                  )}
                  {dirty && (
                    <div className="flex items-center gap-3 shrink-0">
                      <Button
                        variant="primary"
                        className="px-6 rounded-[8px]"
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? "Saving..." : "Save"}
                      </Button>
                      <button
                        type="button"
                        onClick={handleReset}
                        className="text-sm text-news hover:text-ink transition-colors"
                      >
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 pt-1 text-base text-news">
            <a href="https://github.com/Sahil-Lakhani" target="_blank" rel="noopener noreferrer" className="text-ink hover:text-blue-500 transition">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://www.linkedin.com/in/YOUR-LINKEDIN-USERNAME" target="_blank" rel="noopener noreferrer" className="text-ink hover:text-blue-500 transition">
              <Linkedin className="w-5 h-5" />
            </a>
            <span className="font-medium">Developed by Sahil · v1.0</span>
          </div>
        </>
      )}
    </div>
  )
}
