import { useState } from "react"
import { localDate } from "../lib/utils"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { Upload, Camera, Loader2, Check, X, Plus, Trash2 } from "lucide-react"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useEffect } from "react"
import { analyzeReceipt, MAX_UPLOAD_BYTES } from "../lib/gemini"

import { saveTransaction } from "../lib/firestore"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"
import { usePageTitle } from "../lib/usePageTitle"

// Gemini's `price` is the line total; the form edits a unit price (saved as price × qty).
function unitPrice(item) {
  const unit = parseFloat(item.unit_price)
  if (Number.isFinite(unit)) return String(unit)
  const total = parseFloat(item.price) || 0
  const qty = parseFloat(item.quantity)
  if (!(qty > 0)) return String(total)
  return String(Math.round((total / qty) * 100) / 100)
}

export default function Scan() {
  usePageTitle("Scan Receipt")
  const navigate = useNavigate()
  const { user } = useAuth()
  const { currency } = useCurrency()
  const currencySymbol = getCurrencySymbol(currency)
  const [status, setStatus] = useState("idle") // idle, scanning, review, success
  const [file, setFile] = useState(null)
  const [extractedData, setExtractedData] = useState({
    merchant: "",
    location: "",
    date: "",
    total: "",
    items: []
  })

  const [previewUrl, setPreviewUrl] = useState(null)
  const [scanError, setScanError] = useState("")
  const location = useLocation()
  // Set when arriving from a group's "Add Split → Scan" (state carries groupId but no file)
  const [groupId, setGroupId] = useState(location.state?.groupId || null)

  useEffect(() => {
    if (location.state?.file) {
      const file = location.state.file
      const gId = location.state.groupId || null
      navigate(location.pathname, { replace: true, state: {} })
      if (!file.type?.startsWith("image/") || file.size > MAX_UPLOAD_BYTES) {
        setScanError("Please choose an image file (JPG, PNG, WebP or HEIC) up to 15 MB.")
        return
      }
      setFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setStatus("preview")
      if (gId) setGroupId(gId)
    }
  }, [location.state, navigate])

  // Revoke object URL when it changes or component unmounts to prevent memory leaks
  useEffect(() => {
    const url = previewUrl
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [previewUrl])

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0]
    e.target.value = ""
    if (selectedFile) {
      if (!selectedFile.type.startsWith("image/")) {
        setScanError("Please choose an image file (JPG, PNG, WebP or HEIC).")
        return
      }
      if (selectedFile.size > MAX_UPLOAD_BYTES) {
        setScanError("That image is larger than 15 MB. Please choose a smaller one.")
        return
      }
      setScanError("")
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setStatus("preview")
    }
  }

  const handleAnalyze = async () => {
    if (file) {
      setStatus("scanning")
      setScanError("")
      try {
        const data = await analyzeReceipt(file)
        if (!data?.merchant && !data?.items?.length) {
          setScanError("We couldn't read a receipt in this image. Try a sharper, well-lit photo.")
          setStatus("preview")
          return
        }
        setExtractedData({
          merchant: data.merchant || "",
          location: data.location || "",
          date: data.date || localDate(),
          total: data.total?.toString() || "",
          items: data.items?.map(item => ({
            name: item.name || "",
            price: unitPrice(item),
            quantity: item.quantity?.toString() || "1",
            category: item.category || "Other"
          })) || []
        })
        setStatus("review")
      } catch (error) {
        console.error("Scan failed:", error)
        setScanError(error.userFacing ? error.message : "Failed to analyze receipt. Please try again or check the image quality.")
        setStatus("preview")
      }
    }
  }

  const handleDeleteItem = (index) => {
    const newItems = [...extractedData.items]
    newItems.splice(index, 1)
    setExtractedData({ ...extractedData, items: newItems })
  }

  const handleSave = async () => {
    if (!user) {
      setScanError("Your session has expired. Please sign in again.")
      return
    }
    if (!extractedData.merchant.trim()) {
      setScanError("Please enter the merchant name.")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(extractedData.date)) {
      setScanError("Please enter the receipt date.")
      return
    }
    if (!(parseFloat(extractedData.total) >= 0)) {
      setScanError("Please enter a valid total amount.")
      return
    }
    if (!groupId && !extractedData.items.some((item) => item.name.trim())) {
      setScanError("Please keep at least one line item.")
      return
    }
    setScanError("")

    setStatus("scanning") // Reuse scanning spinner or add a saving state
    try {
      const transactionData = {
        merchant: extractedData.merchant,
        location: extractedData.location,
        date: extractedData.date,
        total: parseFloat(extractedData.total || 0),
        lineItems: extractedData.items.map(item => ({
          name: item.name,
          quantity: parseInt(item.quantity || 1),
          price: parseFloat(item.price || 0),
          totalPrice: parseFloat(item.price || 0) * parseInt(item.quantity || 1),
          category: item.category
        })),
        // email: user.email
      }

      if (groupId) {
        navigate(`/groups/${groupId}/split/new/screen`, {
          state: {
            merchant: extractedData.merchant,
            totalAmount: parseFloat(extractedData.total) || 0,
            date: extractedData.date || localDate(),
            lineItems: transactionData.lineItems,
            fromScan: true
          }
        })
        return
      }

      await saveTransaction(user.uid, transactionData)

      setStatus("success")
      setTimeout(() => {
        navigate("/expenses")
      }, 1500)
    } catch (error) {
      console.error("Error saving transaction:", error)
      setScanError(error.userFacing ? error.message : "Failed to save the expense. Please check the fields and try again.")
      setStatus("review")
    }
  }

  const handleCancel = () => {
    setStatus("idle")
    setFile(null)
    setPreviewUrl(null)
    setScanError("")
    setExtractedData({ merchant: "", location: "", date: "", total: "", items: [] })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-sans font-bold mb-2">Scan Receipt</h1>
      </div>

      {status === "idle" && (
        <Card className="border-dashed border-4 border-news-light bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 bg-news-light rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-ink" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-sans">Upload or Snap a Photo</h3>
              <p className="text-news text-sm">JPG, PNG, WebP or HEIC · up to 15 MB</p>
            </div>
            <div className="flex gap-4">
              <Button className="relative">
                <Upload className="mr-2 h-4 w-4" />
                Upload File
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={handleFileUpload}
                />
              </Button>
              <Button variant="secondary" className="md:hidden relative">
                <Camera className="mr-2 h-4 w-4" />
                Use Camera
                <input
                  type="file"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  accept="image/*"
                  {...(/Android/i.test(navigator.userAgent) ? { capture: "environment" } : {})}
                  onChange={handleFileUpload}
                />
              </Button>
            </div>
            {scanError && <p role="alert" className="text-sm text-red-500 text-center">{scanError}</p>}
          </CardContent>
        </Card>
      )}

      {(status === "idle" || status === "preview") && (
        <p className="text-xs text-news text-center max-w-md mx-auto">
          When you tap “Analyze Receipt”, the photo is sent to Google's Gemini AI service to read it. BudgetMate does not
          store the photo — only the details you confirm. Avoid photos showing card numbers or other people's data.{" "}
          <Link to="/privacy#ai" className="underline hover:text-ink">Privacy Policy</Link>
        </p>
      )}

      {status === "preview" && (
        <Card>
          <CardHeader>
            <CardTitle>Preview Receipt</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-[3/4] w-full max-w-sm mx-auto overflow-hidden rounded-lg border border-border bg-black/5">
              {previewUrl && (
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            {scanError && (
              <p role="alert" className="text-sm text-red-500 text-center">{scanError}</p>
            )}
            <div className="flex gap-4 justify-center">
              <Button onClick={handleAnalyze} className="w-full max-w-xs">
                <Check className="mr-2 h-4 w-4" />
                Analyze Receipt
              </Button>
              <Button variant="secondary" onClick={handleCancel} className="w-full max-w-xs">
                <X className="mr-2 h-4 w-4" />
                Remove
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "scanning" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-ink" />
            <div className="text-center">
              <h3 className="text-lg font-bold font-sans">Analyzing Receipt...</h3>
              <p className="text-news text-sm">Extracting merchant, date, and line items.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Review Extracted Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {groupId && (
              <p className="text-xs text-news bg-ink/5 rounded-md px-3 py-2">
                Splitting for a group — this receipt won't be saved to your expenses.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="scan-merchant" className="text-sm font-medium">Merchant</label>
                <Input
                  id="scan-merchant"
                  value={extractedData.merchant}
                  onChange={(e) => setExtractedData({ ...extractedData, merchant: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="scan-location" className="text-sm font-medium">Location</label>
                <Input
                  id="scan-location"
                  value={extractedData.location}
                  onChange={(e) => setExtractedData({ ...extractedData, location: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="scan-date" className="text-sm font-medium">Date</label>
                <Input
                  id="scan-date"
                  type="date"
                  value={extractedData.date}
                  onChange={(e) => setExtractedData({ ...extractedData, date: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Line Items</label>
              <div className="border-2 border-news-light p-4 space-y-3">
                {extractedData.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center border-b border-border pb-2 last:border-0 last:pb-0">

                    {/* Desktop: Name (4 cols) */}
                    <div className="col-span-10 md:col-span-4">
                      <label className="text-xs text-news mb-1 block md:hidden">Item</label>
                      <Input
                        value={item.name}
                        placeholder="Item Name"
                        onChange={(e) => {
                          const newItems = [...extractedData.items]
                          newItems[idx].name = e.target.value
                          setExtractedData({ ...extractedData, items: newItems })
                        }}
                      />
                    </div>

                    {/* Mobile: Delete Button (2 cols, Row 1) - Desktop: Hidden here, shown at end */}
                    <div className="col-span-2 md:hidden flex justify-end items-end h-full pb-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteItem(idx)}
                        aria-label={`Remove item ${item.name || idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Desktop: Category (3 cols) - Mobile: Row 2 (5 cols) */}
                    <div className="col-span-5 md:col-span-3">
                      <label className="text-xs text-news mb-1 block md:hidden">Category</label>
                      <Input
                        value={item.category}
                        placeholder="Category"
                        onChange={(e) => {
                          const newItems = [...extractedData.items]
                          newItems[idx].category = e.target.value
                          setExtractedData({ ...extractedData, items: newItems })
                        }}
                      />
                    </div>

                    {/* Desktop: Qty (2 cols) - Mobile: Row 2 (3 cols) */}
                    <div className="col-span-3 md:col-span-2">
                      <label className="text-xs text-news mb-1 block md:hidden">Qty</label>
                      <Input
                        value={item.quantity}
                        placeholder="Qty"
                        type="number"
                        onChange={(e) => {
                          const newItems = [...extractedData.items]
                          newItems[idx].quantity = e.target.value
                          setExtractedData({ ...extractedData, items: newItems })
                        }}
                      />
                    </div>

                    {/* Desktop: Price (2 cols) - Mobile: Row 2 (4 cols) */}
                    <div className="col-span-4 md:col-span-2">
                      <label className="text-xs text-news mb-1 block md:hidden">Price</label>
                      <Input
                        value={item.price}
                        placeholder="Price"
                        className="text-right"
                        onChange={(e) => {
                          const newItems = [...extractedData.items]
                          newItems[idx].price = e.target.value
                          setExtractedData({ ...extractedData, items: newItems })
                        }}
                      />
                    </div>

                    {/* Desktop: Delete Button (1 col) - Mobile: Hidden (shown in Row 1) */}
                    <div className="hidden md:flex col-span-1 justify-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        onClick={() => handleDeleteItem(idx)}
                        aria-label={`Remove item ${item.name || idx + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                  </div>
                ))}

                {/* <Button variant="ghost" size="sm" className="w-full border-dashed border-2 border-news-light">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button> */}
              </div>
              <div className="space-y-2">
                <label htmlFor="scan-total" className="text-sm font-medium">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold">{currencySymbol}</span>
                  <Input
                    id="scan-total"
                    inputMode="decimal"
                    className="pl-6 font-bold"
                    value={extractedData.total}
                    onChange={(e) => setExtractedData({ ...extractedData, total: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {scanError && <p role="alert" className="text-sm text-red-500">{scanError}</p>}
            <div className="flex gap-4 pt-4">
              <Button className="flex-1" onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                {groupId ? "Continue to Split" : "Confirm & Save"}
              </Button>
              <Button variant="secondary" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "success" && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-sans text-green-800 dark:text-green-400">Expense Saved!</h3>
              <p className="text-green-600 dark:text-green-500 text-sm">Redirecting to expenses...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
