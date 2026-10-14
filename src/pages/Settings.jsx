import { useState, useEffect, useMemo } from "react"
import { localDate } from "../lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Select } from "../components/Select"
import { Input } from "../components/Input"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { CURRENCIES, getCurrencySymbol } from "../lib/currency"
import { getUserSettings, updateUserSettings } from "../lib/firestore"
import { LogOut, Download, Trash2, Loader2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { exportUserData, downloadJson, deleteAccount } from "../lib/account"
import { usePageTitle } from "../lib/usePageTitle"

export default function Settings() {
  usePageTitle("Settings")
  const { user, logout } = useAuth()
  const { currency, updateCurrency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)

  const emptyBudget = { income: "", savingsType: "percentage", savingsValue: "" }
  const [savedBudget, setSavedBudget] = useState(emptyBudget)
  const [budget, setBudget] = useState(emptyBudget)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const navigate = useNavigate()

  const [aiInsights, setAiInsights] = useState(false)
  const [aiSaving, setAiSaving] = useState(false)
  const [dataBusy, setDataBusy] = useState("") // "", "export", "delete"
  const [dataError, setDataError] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteText, setDeleteText] = useState("")

  useEffect(() => {
    if (!user?.uid) return
    getUserSettings(user.uid).then(settings => {
      setAiInsights(Boolean(settings?.aiInsights))
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
    const inc = parseFloat(budget.income) || 0
    const sv = parseFloat(budget.savingsValue) || 0
    if (inc < 0 || sv < 0) { setSaveError("Amounts can't be negative."); return }
    if (budget.savingsType === "percentage" && sv > 100) { setSaveError("A savings percentage can't be more than 100%."); return }
    if (budget.savingsType === "fixed" && sv > inc) { setSaveError("Your savings goal can't be larger than your income."); return }
    setSaving(true)
    setSaveError("")
    try {
      await updateUserSettings(user.uid, budget)
      setSavedBudget(budget)
      setDirty(false)
    } catch (e) {
      console.error(e)
      setSaveError("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  const handleAiToggle = async (enabled) => {
    setAiSaving(true)
    setDataError("")
    try {
      await updateUserSettings(user.uid, { aiInsights: enabled })
      setAiInsights(enabled)
    } catch (e) {
      console.error(e)
      setDataError(e.userFacing ? e.message : "Couldn't update the AI setting. Please try again.")
    } finally {
      setAiSaving(false)
    }
  }

  const handleExport = async () => {
    setDataBusy("export")
    setDataError("")
    try {
      const data = await exportUserData(user.uid)
      downloadJson(data, `budgetmate-export-${localDate()}.json`)
    } catch (e) {
      console.error(e)
      setDataError("Export failed. Please check your connection and try again.")
    } finally {
      setDataBusy("")
    }
  }

  const handleDelete = async () => {
    setDataBusy("delete")
    setDataError("")
    try {
      await deleteAccount()
      navigate("/login", { replace: true })
    } catch (e) {
      console.error(e)
      setDataError(
        e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request"
          ? "Account deletion was cancelled — please confirm with Google to continue."
          : e?.code === "auth/user-mismatch"
            ? "Please confirm with the same Google account you are signed in with."
            : "Account deletion failed. Please try again, or contact us via the Impressum."
      )
      setDataBusy("")
    }
  }

  const handleReset = () => {
    setBudget(savedBudget)
    setDirty(false)
  }

  const { income, savingsAmount, spendable } = useMemo(() => {
    const inc = parseFloat(budget.income) || 0
    const sv = parseFloat(budget.savingsValue) || 0
    const saved = budget.savingsType === "percentage" ? (inc * sv) / 100 : sv
    return { income: inc, savingsAmount: saved, spendable: inc - saved }
  }, [budget.income, budget.savingsValue, budget.savingsType])

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-sans font-bold text-ink">Settings</h1>
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
                aria-label="Currency"
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
                <label htmlFor="budget-income" className="text-base font-medium text-ink">Monthly Income</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-news pointer-events-none">
                    {currencySymbol}
                  </span>
                  <Input
                    id="budget-income"
                    type="number"
                    inputMode="decimal"
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
                <p id="savings-type-label" className="text-base font-medium text-ink">Savings Goal Type</p>
                <div className="flex gap-2" role="group" aria-labelledby="savings-type-label">
                  <button
                    type="button"
                    aria-pressed={budget.savingsType === "percentage"}
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
                    aria-pressed={budget.savingsType === "fixed"}
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
                <label htmlFor="budget-savings" className="text-base font-medium text-ink">
                  {budget.savingsType === "percentage" ? "Savings Percentage" : "Savings Amount"}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-news pointer-events-none">
                    {budget.savingsType === "percentage" ? "%" : currencySymbol}
                  </span>
                  <Input
                    id="budget-savings"
                    type="number"
                    inputMode="decimal"
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
                    <div className="flex flex-col gap-2 shrink-0">
                      {saveError && <p role="alert" className="text-sm text-red-500">{saveError}</p>}
                      <div className="flex items-center gap-3">
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
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI features */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">AI insights</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-2">
              <div className="flex items-start justify-between gap-4">
                <label htmlFor="ai-insights" className="text-sm text-news cursor-pointer">
                  Once a month, send last month's expenses (dates, merchants, amounts, items — not your name or email)
                  to Google's Gemini AI to get personalised saving tips. Off by default; you can switch it off at any
                  time. <Link to="/privacy#ai" className="underline hover:text-ink">Details</Link>
                </label>
                <input
                  id="ai-insights"
                  type="checkbox"
                  role="switch"
                  checked={aiInsights}
                  disabled={aiSaving}
                  onChange={(e) => handleAiToggle(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-current cursor-pointer"
                />
              </div>
            </CardContent>
          </Card>

          {/* Your data (GDPR) */}
          <Card>
            <CardHeader className="p-5 pb-2">
              <CardTitle className="text-lg">Your data</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0 space-y-4">
              <p className="text-sm text-news">
                Download a copy of everything stored for your account, or permanently delete your account and data.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="secondary" className="rounded-md" onClick={handleExport} disabled={Boolean(dataBusy)}>
                  {dataBusy === "export" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="mr-2 h-4 w-4" aria-hidden="true" />}
                  Export my data (JSON)
                </Button>
                {!confirmDelete && (
                  <Button variant="secondary" className="rounded-md text-red-600 dark:text-red-400" onClick={() => setConfirmDelete(true)} disabled={Boolean(dataBusy)}>
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete account
                  </Button>
                )}
              </div>

              {confirmDelete && (
                <div className="rounded-md border border-red-300 dark:border-red-900 p-4 space-y-3">
                  <p className="text-sm text-ink">
                    This permanently deletes your expenses, settings, notifications and profile, removes you from your
                    groups and deletes your sign-in account. Split records you shared with others stay visible to them.
                    This cannot be undone. You will be asked to confirm with Google.
                  </p>
                  <label htmlFor="delete-confirm" className="block text-sm font-medium text-ink">
                    Type DELETE to confirm
                  </label>
                  <Input
                    id="delete-confirm"
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    autoComplete="off"
                    className="rounded-md"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="destructive" className="rounded-md" onClick={handleDelete} disabled={deleteText !== "DELETE" || Boolean(dataBusy)}>
                      {dataBusy === "delete" ? "Deleting…" : "Permanently delete"}
                    </Button>
                    <Button variant="ghost" className="rounded-md" onClick={() => { setConfirmDelete(false); setDeleteText("") }} disabled={dataBusy === "delete"}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {dataError && <p role="alert" className="text-sm text-red-500">{dataError}</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
