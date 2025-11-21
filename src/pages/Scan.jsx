import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { Upload, Camera, Loader2, Check, X, Plus } from "lucide-react"
import { useNavigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { analyzeReceipt } from "../lib/gemini"

export default function Scan() {
  const navigate = useNavigate()
  const [status, setStatus] = useState("idle") // idle, scanning, review, success
  const [file, setFile] = useState(null)
  const [extractedData, setExtractedData] = useState({
    merchant: "",
    date: "",
    total: "",
    items: []
  })

  const [previewUrl, setPreviewUrl] = useState(null)
  const location = useLocation()

  useEffect(() => {
    if (location.state?.file) {
      const file = location.state.file
      setFile(file)
      setPreviewUrl(URL.createObjectURL(file))
      setStatus("preview")
      // Clear state so it doesn't re-trigger on refresh (though location state usually persists)
      // We can replace the history entry to clear it
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, navigate])

  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      setFile(selectedFile)
      setPreviewUrl(URL.createObjectURL(selectedFile))
      setStatus("preview")
    }
  }

  const handleAnalyze = async () => {
    if (file) {
      setStatus("scanning")
      try {
        const data = await analyzeReceipt(file)
        setExtractedData({
          merchant: data.merchant || "",
          date: data.date || new Date().toISOString().split('T')[0],
          total: data.total?.toString() || "",
          items: data.items?.map(item => ({
            name: item.name || "",
            price: item.price?.toString() || "0",
            quantity: item.quantity?.toString() || "1",
            category: item.category || "Other"
          })) || []
        })
        setStatus("review")
      } catch (error) {
        console.error("Scan failed:", error)
        setStatus("preview") // Go back to preview on error
        // Could add error toast here
      }
    }
  }

  const handleSave = () => {
    // In a real app, this would save to the backend/context
    setStatus("success")
    setTimeout(() => {
      navigate("/expenses")
    }, 1500)
  }

  const handleCancel = () => {
    setStatus("idle")
    setFile(null)
    setPreviewUrl(null)
    setExtractedData({ merchant: "", date: "", total: "", items: [] })
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-serif font-bold mb-2 text-ink">Scan Receipt</h2>
        <p className="text-news">AI-powered receipt extraction.</p>
      </div>

      {status === "idle" && (
        <Card className="border-dashed border-4 border-news-light bg-transparent shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="h-16 w-16 bg-news-light rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-ink" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold font-serif">Upload or Snap a Photo</h3>
              <p className="text-news text-sm">Supported formats: JPG, PNG, PDF</p>
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
              <Button variant="secondary" className="md:hidden">
                <Camera className="mr-2 h-4 w-4" />
                Use Camera
              </Button>
            </div>
          </CardContent>
        </Card>
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
              <h3 className="text-lg font-bold font-serif">Analyzing Receipt...</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Merchant</label>
                <Input
                  value={extractedData.merchant}
                  onChange={(e) => setExtractedData({ ...extractedData, merchant: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input
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
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start border-b border-border pb-2 last:border-0 last:pb-0">
                    <div className="col-span-12 md:col-span-4">
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
                    <div className="col-span-4 md:col-span-3">
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
                    <div className="col-span-4 md:col-span-2">
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
                    <div className="col-span-4 md:col-span-3">
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

                  </div>


                ))}

                {/* <Button variant="ghost" size="sm" className="w-full border-dashed border-2 border-news-light">
                  <Plus className="h-4 w-4 mr-2" /> Add Item
                </Button> */}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold">$</span>
                  <Input
                    className="pl-6 font-bold"
                    value={extractedData.total}
                    onChange={(e) => setExtractedData({ ...extractedData, total: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button className="flex-1" onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                Confirm & Save
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
              <h3 className="text-lg font-bold font-serif text-green-800 dark:text-green-400">Expense Saved!</h3>
              <p className="text-green-600 dark:text-green-500 text-sm">Redirecting to expenses...</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
