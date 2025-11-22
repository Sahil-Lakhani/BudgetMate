import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Calendar, MapPin, ShoppingBasket, Shirt, Smartphone, Coffee, Utensils, Car, Home, Zap, Tag } from "lucide-react"
import { Button } from "../components/Button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Badge } from "../components/Badge"
import { useAuth } from "../context/AuthContext"
import { getTransaction } from "../lib/firestore"

export default function TransactionDetails() {
	const { id } = useParams()
	const navigate = useNavigate()
	const { user } = useAuth()
	const [transaction, setTransaction] = useState(null)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const fetchTransaction = async () => {
			if (user?.uid && id) {
				try {
					const data = await getTransaction(user.uid, id)
					setTransaction(data)
				} catch (error) {
					console.error("Error loading transaction:", error)
				} finally {
					setLoading(false)
				}
			}
		}
		fetchTransaction()
	}, [user, id])

	const getCategoryIcon = (category) => {
		const cat = category?.toLowerCase() || ""
		if (cat.includes("grocer") || cat.includes("food")) return <ShoppingBasket className="h-6 w-6 text-ink" />
		if (cat.includes("cloth") || cat.includes("wear")) return <Shirt className="h-6 w-6 text-ink" />
		if (cat.includes("electr") || cat.includes("mobile") || cat.includes("phone")) return <Smartphone className="h-6 w-6 text-ink" />
		if (cat.includes("transport") || cat.includes("gas") || cat.includes("fuel") || cat.includes("uber")) return <Car className="h-6 w-6 text-ink" />
		if (cat.includes("home") || cat.includes("rent") || cat.includes("house")) return <Home className="h-6 w-6 text-ink" />
		if (cat.includes("util") || cat.includes("bill") || cat.includes("internet")) return <Zap className="h-6 w-6 text-ink" />
		if (cat.includes("restaurant") || cat.includes("dining") || cat.includes("eat")) return <Utensils className="h-6 w-6 text-ink" />
		if (cat.includes("coffee") || cat.includes("cafe")) return <Coffee className="h-6 w-6 text-ink" />
		return <Tag className="h-6 w-6 text-ink" />
	}

	if (loading) {
		return <div className="p-8 text-center text-news">Loading transaction details...</div>
	}

	if (!transaction) {
		return (
			<div className="p-8 text-center space-y-4">
				<p className="text-news">Transaction not found.</p>
				<Button onClick={() => navigate("/expenses")}>Back to Expenses</Button>
			</div>
		)
	}

	return (
		<div className="max-w-2xl mx-auto space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={() => navigate("/expenses")}>
					<ArrowLeft className="h-5 w-5 text-ink" />
				</Button>
				<h2 className="text-2xl font-serif font-bold text-ink">Transaction Details</h2>
			</div>

			<Card>
				<CardContent className="p-6 space-y-6">
					{/* Header Section */}
					<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
						<div className="flex items-center gap-4 w-full md:w-auto">
							<div className="h-12 w-12 bg-news-light/20 flex items-center justify-center rounded-full shrink-0">
								{getCategoryIcon(transaction.lineItems?.[0]?.category || "General")}
							</div>
							<div className="flex-1">
								<div className="flex items-center justify-between md:justify-start">
									<h3 className="text-xl font-bold text-ink">{transaction.merchant}</h3>
								</div>
								<div className="flex items-center gap-2 text-news text-sm mt-1">
									<Calendar className="h-3 w-3" />
									<span>{transaction.date}</span>
									{transaction.location && (
										<div className="hidden md:flex items-center gap-1 ">
											<MapPin className="h-3 w-3" />
											<span>{transaction.location}</span>
										</div>
									)}
								</div>
							</div>
							<div className=" items-center gap-2 text-news text-sm mt-1">
								<div className="text-xl font-bold text-ink md:hidden">€{parseFloat(transaction.total).toFixed(2)}</div>
								<p className="font-bold text-news md:hidden text-right">Total</p>
							</div>
						</div>
						<div className="text-left md:text-right hidden md:block">
							<p className="text-2xl font-bold text-ink">€{parseFloat(transaction.total).toFixed(2)}</p>
							<p className="font-bold text-news">Total</p>
						</div>
					</div>

					{/* Line Items Section */}
					<div>
						<h4 className="text-sm font-medium text-news uppercase tracking-wider mb-4">Line Items</h4>
						<div className="space-y-3">
							{transaction.lineItems?.map((item, idx) => (
								<div key={idx} className="flex justify-between items-center py-2 border-b border-border last:border-0">
									<div className="flex-1">
										<p className="font-medium text-ink">{item.name}</p>
										<p className="text-xs text-news">{item.category} • Qty: {item.quantity}</p>
									</div>
									<p className="font-medium text-ink">€{parseFloat(item.totalPrice || item.price).toFixed(2)}</p>
								</div>
							))}
						</div>
					</div>

					<div className="text-xs text-news">
						<div className="flex items-center gap-1 justify-center">
							{transaction.location && (
								<div className="md:hidden">
									<span>Store Location: {transaction.location}</span>
								</div>
							)}
							Source
							<span className="capitalize">{transaction.source || "Manual"}</span>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
