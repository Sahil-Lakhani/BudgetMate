import { useState } from "react"
import { localDate } from "../lib/utils"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "../components/Button"
import { Card, CardContent } from "../components/Card"
import { Input } from "../components/Input"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { getCurrencySymbol } from "../lib/currency"
import { saveTransaction } from "../lib/firestore"
import { Select } from "../components/Select"
import { usePageTitle } from "../lib/usePageTitle"

const CATEGORIES = [
	"Groceries",
	"Clothing",
	"Electronics",
	"Transportation",
	"Home & Garden",
	"Utilities",
	"Restaurant",
	"Coffee & Cafe",
	"General"
]

export default function AddTransaction() {
	usePageTitle("Add Transaction")
	const navigate = useNavigate()
	const { user } = useAuth()
	const { currency } = useCurrency()
	const currencySymbol = getCurrencySymbol(currency)
	const [saving, setSaving] = useState(false)
	const [formError, setFormError] = useState("")

	// Get today's date in YYYY-MM-DD format
	const today = localDate()

	const [formData, setFormData] = useState({
		merchant: "",
		date: today,
		location: "",
		lineItems: [
			{
				name: "",
				category: "General",
				quantity: 1,
				price: 0
			}
		]
	})

	const handleInputChange = (e) => {
		const { name, value } = e.target
		setFormData(prev => ({
			...prev,
			[name]: value
		}))
	}

	const handleLineItemChange = (index, field, value) => {
		const newLineItems = [...formData.lineItems]
		newLineItems[index][field] = value
		setFormData(prev => ({
			...prev,
			lineItems: newLineItems
		}))
	}

	const addLineItem = () => {
		setFormData(prev => ({
			...prev,
			lineItems: [
				...prev.lineItems,
				{
					name: "",
					category: "General",
					quantity: 1,
					price: 0
				}
			]
		}))
	}

	const removeLineItem = (index) => {
		if (formData.lineItems.length > 1) {
			const newLineItems = formData.lineItems.filter((_, i) => i !== index)
			setFormData(prev => ({
				...prev,
				lineItems: newLineItems
			}))
		}
	}

	const calculateTotal = () => {
		return formData.lineItems.reduce((sum, item) => {
			const itemTotal = parseFloat(item.quantity || 0) * parseFloat(item.price || 0)
			return sum + itemTotal
		}, 0)
	}

	const handleSubmit = async (e) => {
		e.preventDefault()

		// Validation
		if (!formData.merchant.trim()) {
			setFormError("Please enter a merchant name.")
			return
		}

		if (!formData.date) {
			setFormError("Please select a date.")
			return
		}

		// Check if at least one line item has a name
		const hasValidLineItem = formData.lineItems.some(item => item.name.trim())
		if (!hasValidLineItem) {
			setFormError("Please add at least one item with a name.")
			return
		}

		const badNumber = formData.lineItems.some(item => item.name.trim() &&
			((parseFloat(item.price) || 0) < 0 || (item.quantity !== "" && !(parseFloat(item.quantity) > 0))))
		if (badNumber) {
			setFormError("Prices can't be negative and quantities must be greater than zero.")
			return
		}
		setFormError("")

		setSaving(true)

		try {
			// Filter out empty line items
			const validLineItems = formData.lineItems
				.filter(item => item.name.trim())
				.map(item => ({
					name: item.name.trim(),
					category: item.category,
					quantity: parseFloat(item.quantity) || 1,
					price: parseFloat(item.price) || 0,
					totalPrice: (parseFloat(item.quantity) || 1) * (parseFloat(item.price) || 0)
				}))

			const transactionData = {
				merchant: formData.merchant.trim(),
				date: formData.date,
				location: formData.location.trim() || "",
				lineItems: validLineItems,
				total: calculateTotal(),
				source: "manual"
			}

			await saveTransaction(user.uid, transactionData)
			navigate("/expenses")
		} catch (error) {
			console.error("Error saving transaction:", error)
			setFormError(error.userFacing ? error.message : "Failed to save the transaction. Please check the fields and try again.")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => navigate("/expenses")} aria-label="Back to expenses">
					<ArrowLeft className="h-5 w-5 text-ink" aria-hidden="true" />
				</Button>
				<h1 className="text-2xl font-sans font-bold text-ink">Add Transaction</h1>
			</div>

			<form onSubmit={handleSubmit} noValidate>
				<Card>
					<CardContent className="p-6 space-y-6">
						{/* Basic Information */}
						<div className="space-y-4">
							<h3 className="text-sm font-sans font-medium text-news uppercase tracking-wider">Transaction Details</h3>

							<div className="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
								<div className="space-y-2 col-span-2 lg:col-span-1">
									<label htmlFor="tx-merchant" className="text-sm font-medium text-ink">
										Merchant Name <span className="text-red-500" aria-hidden="true">*</span>
									</label>
									<Input
										id="tx-merchant"
										name="merchant"
										maxLength={100}
										value={formData.merchant}
										onChange={handleInputChange}
										placeholder="e.g. REWE, Lidl"
										className="rounded-[8px]"
										required
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="tx-date" className="text-sm font-medium text-ink">
										Date <span className="text-red-500" aria-hidden="true">*</span>
									</label>
									<Input
										id="tx-date"
										type="date"
										name="date"
										value={formData.date}
										onChange={handleInputChange}
										className="rounded-[8px] [color-scheme:light] dark:[color-scheme:dark]"
										required
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="tx-location" className="text-sm font-medium text-ink">Location</label>
									<Input
										id="tx-location"
										name="location"
										maxLength={100}
										value={formData.location}
										onChange={handleInputChange}
										placeholder="e.g. Berlin"
										className="rounded-[8px]"
									/>
								</div>
							</div>
						</div>

						{/* Line Items */}
						<div className="border-t border-border pt-4">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-sans font-medium text-news uppercase tracking-wider">Line Items</h3>
								<Button
									type="button"
									variant="secondary"
									size="sm"
									onClick={addLineItem}
									className="rounded-[8px]"
								>
									<Plus className="h-4 w-4 mr-2" />
									Add Item
								</Button>
							</div>

							<div className="pt-2">
								{formData.lineItems.map((item, index) => (
									<div key={index} className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-ink">Item {index + 1}</span>
											{formData.lineItems.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeLineItem(index)}
													aria-label={`Remove item ${index + 1}`}
													className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>

										<div className="grid grid-cols-2 gap-3">
											<div className="space-y-1">
												<label htmlFor={`item-${index}-name`} className="text-xs font-medium text-news">Item Name</label>
												<Input
													id={`item-${index}-name`}
													maxLength={100}
													value={item.name}
													onChange={(e) => handleLineItemChange(index, "name", e.target.value)}
													placeholder="e.g., Milk, Bread"
													className="rounded-[8px]"
												/>
											</div>

											<div className="space-y-2">
												<label htmlFor={`item-${index}-category`} className="text-xs font-medium text-news">Category</label>
												<Select
													id={`item-${index}-category`}
													value={item.category}
													onChange={(e) => handleLineItemChange(index, "category", e.target.value)}
													options={CATEGORIES.map(cat => ({ value: cat, label: cat }))}
												/>
											</div>

											<div className="space-y-2">
												<label htmlFor={`item-${index}-qty`} className="text-xs font-medium text-news">Quantity</label>
												<Input
													id={`item-${index}-qty`}
													inputMode="numeric"
													type="number"
													min="1"
													step="1"
													value={item.quantity}
													onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
													className="rounded-[8px]"
												/>
											</div>

											<div className="space-y-2">
												<label htmlFor={`item-${index}-price`} className="text-xs font-medium text-news">Price ({currencySymbol})</label>
												<Input
													id={`item-${index}-price`}
													inputMode="decimal"
													type="number"
													min="0"
													step="0.01"
													value={item.price}
													onChange={(e) => handleLineItemChange(index, "price", e.target.value)}
													className="rounded-[8px]"
												/>
											</div>
										</div>

										<div className="text-right">
											<span className="text-sm text-news">Item Total: </span>
											<span className="text-sm font-bold text-ink">
												{currencySymbol}{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Total */}
						<div className="border-t border-border pt-2">
							<div className="flex justify-between items-center bg-news-light/20 p-4 rounded-lg">
								<span className="text-lg font-medium text-ink">Total Amount</span>
								<span className="text-2xl font-bold text-ink">{currencySymbol}{calculateTotal().toFixed(2)}</span>
							</div>
						</div>

						{formError && <p role="alert" className="text-sm text-red-500">{formError}</p>}

						{/* Action Buttons */}
						<div className="flex gap-3 pt-4">
							<Button
								type="button"
								variant="secondary"
								onClick={() => navigate("/expenses")}
								className="flex-1 rounded-[8px]"
								disabled={saving}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								variant="primary"
								className="flex-1 rounded-[8px]"
								disabled={saving}
							>
								{saving ? "Saving..." : "Save Transaction"}
							</Button>
						</div>
					</CardContent>
				</Card>
			</form>
		</div>
	)
}
