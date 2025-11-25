import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "../components/Button"
import { Card, CardContent } from "../components/Card"
import { Input } from "../components/Input"
import { useAuth } from "../context/AuthContext"
import { saveTransaction } from "../lib/firestore"

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
	const navigate = useNavigate()
	const { user } = useAuth()
	const [saving, setSaving] = useState(false)

	// Get today's date in YYYY-MM-DD format
	const today = new Date().toISOString().split('T')[0]

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
			alert("Please enter a merchant name")
			return
		}

		if (!formData.date) {
			alert("Please select a date")
			return
		}

		// Check if at least one line item has a name
		const hasValidLineItem = formData.lineItems.some(item => item.name.trim())
		if (!hasValidLineItem) {
			alert("Please add at least one item")
			return
		}

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
				total: calculateTotal().toFixed(2),
				source: "manual"
			}

			await saveTransaction(user.uid, transactionData)
			navigate("/expenses")
		} catch (error) {
			console.error("Error saving transaction:", error)
			alert("Failed to save transaction. Please try again.")
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="max-w-3xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
					<ArrowLeft className="h-5 w-5 text-ink" />
				</Button>
				<h2 className="text-2xl font-sans font-bold text-ink">Add Transaction</h2>
			</div>

			<form onSubmit={handleSubmit}>
				<Card>
					<CardContent className="p-6 space-y-6">
						{/* Basic Information */}
						<div className="space-y-4">
							<h3 className="text-sm font-medium text-news uppercase tracking-wider">Transaction Details</h3>

							<div className="space-y-2">
								<label className="text-sm font-medium text-ink">
									Merchant Name <span className="text-red-500">*</span>
								</label>
								<Input
									name="merchant"
									value={formData.merchant}
									onChange={handleInputChange}
									placeholder="e.g., Walmart, Starbucks"
									className="rounded-[8px]"
									required
								/>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-sm font-medium text-ink">
										Date <span className="text-red-500">*</span>
									</label>
									<Input
										type="date"
										name="date"
										value={formData.date}
										onChange={handleInputChange}
										className="rounded-[8px]"
										required
									/>
								</div>

								<div className="space-y-2">
									<label className="text-sm font-medium text-ink">Location (Optional)</label>
									<Input
										name="location"
										value={formData.location}
										onChange={handleInputChange}
										placeholder="e.g., New York, NY"
										className="rounded-[8px]"
									/>
								</div>
							</div>
						</div>

						{/* Line Items */}
						<div className="space-y-4 border-t border-border pt-6">
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium text-news uppercase tracking-wider">Line Items</h3>
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

							<div className="space-y-4">
								{formData.lineItems.map((item, index) => (
									<div key={index} className="bg-news-light/10 p-4 rounded-lg space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium text-ink">Item {index + 1}</span>
											{formData.lineItems.length > 1 && (
												<Button
													type="button"
													variant="ghost"
													size="icon"
													onClick={() => removeLineItem(index)}
													className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											)}
										</div>

										<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
											<div className="space-y-2">
												<label className="text-xs font-medium text-news">Item Name</label>
												<Input
													value={item.name}
													onChange={(e) => handleLineItemChange(index, "name", e.target.value)}
													placeholder="e.g., Milk, Bread"
													className="rounded-[8px]"
												/>
											</div>

											<div className="space-y-2">
												<label className="text-xs font-medium text-news">Category</label>
												<select
													value={item.category}
													onChange={(e) => handleLineItemChange(index, "category", e.target.value)}
													className="flex h-10 w-full border border-border bg-transparent text-ink px-3 py-2 text-sm rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
												>
													{CATEGORIES.map(cat => (
														<option key={cat} value={cat}>{cat}</option>
													))}
												</select>
											</div>

											<div className="space-y-2">
												<label className="text-xs font-medium text-news">Quantity</label>
												<Input
													type="number"
													min="1"
													step="1"
													value={item.quantity}
													onChange={(e) => handleLineItemChange(index, "quantity", e.target.value)}
													className="rounded-[8px]"
												/>
											</div>

											<div className="space-y-2">
												<label className="text-xs font-medium text-news">Price (€)</label>
												<Input
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
												€{((parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0)).toFixed(2)}
											</span>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Total */}
						<div className="border-t border-border pt-6">
							<div className="flex justify-between items-center bg-news-light/20 p-4 rounded-lg">
								<span className="text-lg font-medium text-ink">Total Amount</span>
								<span className="text-2xl font-bold text-ink">€{calculateTotal().toFixed(2)}</span>
							</div>
						</div>

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
