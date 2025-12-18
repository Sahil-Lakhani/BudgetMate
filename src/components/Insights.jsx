import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './Card';
import { Lightbulb, TrendingUp, TrendingDown, ShoppingBag, Sparkles, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { generateMonthlyInsights } from '../lib/gemini';

export default function Insights({ transactions }) {
	const { theme } = useTheme();
	const [aiInsights, setAiInsights] = useState([]);
	const [loadingAI, setLoadingAI] = useState(false);
	const [currentSlide, setCurrentSlide] = useState(0);

	const ruleBasedInsights = useMemo(() => {
		if (!transactions || transactions.length === 0) return [];

		const tips = [];
		const now = new Date();
		const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM
		const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
		const lastMonth = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM

		// 1. Flatten items
		const allItems = [];
		transactions.forEach(t => {
			if (t.lineItems && Array.isArray(t.lineItems)) {
				t.lineItems.forEach(item => {
					allItems.push({
						name: item.name || item.description || "Unknown Item",
						price: parseFloat(item.totalPrice || item.price || 0),
						unitPrice: parseFloat(item.price || 0),
						merchant: t.merchant,
						date: t.date,
						month: t.date.slice(0, 7)
					});
				});
			}
		});

		// Filter out items with zero/invalid price
		const validItems = allItems.filter(i => i.unitPrice > 0 || i.price > 0);

		// 2. Price Comparison
		const itemGroups = {};
		validItems.forEach(item => {
			const key = item.name.toLowerCase().trim();
			if (!itemGroups[key]) itemGroups[key] = [];
			itemGroups[key].push(item);
		});

		Object.entries(itemGroups).forEach(([name, items]) => {
			if (items.length < 2) return;
			const recentItems = items.filter(i => {
				const itemDate = new Date(i.date);
				const threeMonthsAgo = new Date();
				threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
				return itemDate >= threeMonthsAgo;
			});
			if (recentItems.length < 2) return;
			recentItems.sort((a, b) => a.unitPrice - b.unitPrice);
			const cheapest = recentItems[0];
			const expensive = recentItems[recentItems.length - 1];

			if (expensive.unitPrice > cheapest.unitPrice * 1.1) {
				if (cheapest.merchant !== expensive.merchant) {
					const diff = expensive.unitPrice - cheapest.unitPrice;
					tips.push({
						type: 'saving',
						title: 'Smart Shopper Tip',
						message: `You paid €${expensive.unitPrice.toFixed(2)} for ${name} at ${expensive.merchant}, but it was only €${cheapest.unitPrice.toFixed(2)} at ${cheapest.merchant}.`,
						icon: <Lightbulb className="h-5 w-5 text-yellow-500" />,
						priority: diff,
						isAi: false
					});
				}
			}
		});

		// 3. Spending Trends
		let currentMonthTotal = 0;
		let lastMonthTotal = 0;
		const previousMonthTransactions = [];

		transactions.forEach(t => {
			const amount = parseFloat(t.total || 0);
			if (t.date.startsWith(currentMonth)) currentMonthTotal += amount;
			if (t.date.startsWith(lastMonth)) {
				previousMonthTransactions.push(t);
				lastMonthTotal += amount;
			}
		});

		if (previousMonthTransactions.length > 0) {
			// console.log("Previous Month Data JSON:", JSON.stringify(previousMonthTransactions, null, 2));
		}

		if (currentMonthTotal > 0 && lastMonthTotal > 0) {
			const diff = currentMonthTotal - lastMonthTotal;
			const percent = ((diff / lastMonthTotal) * 100).toFixed(1);

			if (diff > 0) {
				tips.push({
					type: 'trend_up',
					title: 'Spending Alert',
					message: `You've spent €${diff.toFixed(2)} (${percent}%) more this month compared to last month.`,
					icon: <TrendingUp className="h-5 w-5 text-red-500" />,
					priority: 100,
					isAi: false
				});
			} else if (diff < 0) {
				tips.push({
					type: 'trend_down',
					title: 'Great Job!',
					message: `You've saved €${Math.abs(diff).toFixed(2)} (${Math.abs(percent)}%) compared to last month!`,
					icon: <TrendingDown className="h-5 w-5 text-green-500" />,
					priority: 90,
					isAi: false
				});
			}
		}

		// 4. Most Frequent Merchant
		const merchantCounts = {};
		transactions.forEach(t => {
			if (t.date.startsWith(currentMonth)) {
				merchantCounts[t.merchant] = (merchantCounts[t.merchant] || 0) + 1;
			}
		});

		let topMerchant = null;
		let maxVisits = 0;
		Object.entries(merchantCounts).forEach(([m, count]) => {
			if (count > maxVisits) {
				maxVisits = count;
				topMerchant = m;
			}
		});

		if (topMerchant && maxVisits > 2) {
			tips.push({
				type: 'habit',
				title: 'Buying Habit',
				message: `You've visited ${topMerchant} ${maxVisits} times this month.`,
				icon: <ShoppingBag className="h-5 w-5 text-blue-500" />,
				priority: 10,
				isAi: false
			});
		}

		const uniqueTips = [];
		const seenMessages = new Set();
		tips.sort((a, b) => b.priority - a.priority).forEach(tip => {
			if (!seenMessages.has(tip.message)) {
				uniqueTips.push(tip);
				seenMessages.add(tip.message);
			}
		});

		return uniqueTips.slice(0, 3);
	}, [transactions]);


	// AI Insights Logic
	useEffect(() => {
		const fetchAIInsights = async () => {
			if (!transactions || transactions.length === 0) return;

			const now = new Date();
			const currentMonthKey = `insights_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

			// Check cache
			const cached = localStorage.getItem(currentMonthKey);
			if (cached) {
				try {
					setAiInsights(JSON.parse(cached));
					return;
				} catch (e) {
					console.error("Failed to parse cached insights", e);
					localStorage.removeItem(currentMonthKey);
				}
			}

			// Prepare data for previous month
			const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
			const lastMonth = lastMonthDate.toISOString().slice(0, 7); // YYYY-MM

			const previousMonthTransactions = transactions.filter(t => t.date.startsWith(lastMonth));

			if (previousMonthTransactions.length < 5) return;

			setLoadingAI(true);
			try {
				const result = await generateMonthlyInsights(previousMonthTransactions);
				if (result && result.suggestions) {
					setAiInsights(result.suggestions);
					localStorage.setItem(currentMonthKey, JSON.stringify(result.suggestions));
				}
			} catch (error) {
				console.error("Error fetching AI insights:", error);
			} finally {
				setLoadingAI(false);
			}
		};

		fetchAIInsights();
	}, [transactions]);

	// Combine all slides
	const allSlides = useMemo(() => {
		const slides = [];

		// Add AI insights as slides
		if (loadingAI) {
			slides.push({ type: 'loading_ai', id: 'loading' });
		} else {
			aiInsights.forEach((insight, index) => {
				slides.push({ ...insight, type: 'ai', id: `ai-${index}`, isAi: true });
			});
		}

		// Add rule-based insights
		ruleBasedInsights.forEach((insight, index) => {
			slides.push({ ...insight, id: `rule-${index}`, isAi: false });
		});

		return slides;
	}, [aiInsights, ruleBasedInsights, loadingAI]);

	// Auto-scroll logic
	useEffect(() => {
		if (allSlides.length <= 1) return;

		const interval = setInterval(() => {
			setCurrentSlide((prev) => (prev + 1) % allSlides.length);
		}, 4000); // 4 seconds

		return () => clearInterval(interval);
	}, [allSlides.length]);
	if (allSlides.length === 0) return null;

	const currentItem = allSlides[currentSlide];

	return (
		<Card className={`mb-6 transition-colors duration-300 border-l-4 border-l-ink bg-white dark:bg-neutral-900`}>
			<CardHeader className="pb-2 flex flex-row items-center justify-between">
				<CardTitle className={`text-lg font-sans flex items-center gap-2 text-ink`}>
					{currentItem.isAi ? <Sparkles className="h-5 w-5" /> : <Lightbulb className="h-5 w-5 text-news" />}
					{currentItem.isAi ? "AI Finance Assistant" : "Insights & Tips"}
				</CardTitle>

				{/* Dots */}
				<div className="flex gap-1.5">
					{allSlides.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentSlide(index)}
							className={`w-2 h-2 rounded-full transition-all duration-300 ${index === currentSlide
								? 'bg-ink w-4'
								: 'bg-neutral-300 dark:bg-neutral-700 hover:bg-neutral-400'
								}`}
							aria-label={`Go to slide ${index + 1}`}
						/>
					))}
				</div>
			</CardHeader>
			<CardContent className="h-[200px] flex items-center overflow-y-auto custom-scrollbar">
				<div className="w-full transition-opacity duration-300 animate-in fade-in slide-in-from-right-4">
					{currentItem.type === 'loading_ai' ? (
						<div className="flex items-center gap-2 text-sm text-news animate-pulse py-4">
							<Sparkles className="h-4 w-4" />
							Analyzing last month's spending patterns...
						</div>
					) : currentItem.isAi ? (
						<div className="flex flex-col gap-2">
							<div className="flex items-start gap-3">
								<div className="mt-1 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full hidden sm:block">
									<Lightbulb className="h-4 w-4 text-ink" />
								</div>
								<div className="w-full">
									<h4 className="font-bold text-base text-ink font-sans mb-1">{currentItem.title}</h4>
									<p className="text-sm text-news mb-3 leading-relaxed">{currentItem.insight}</p>
									<div className="flex flex-wrap gap-2">
										<span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-md font-medium flex items-center gap-1">
											<TrendingDown className="h-3 w-3" />
											Save ~€{currentItem.estimated_saving_per_month}
										</span>
										<span className="text-xs border border-neutral-200 text-ink dark:border-neutral-700 dark:text-neutral-300 px-2.5 py-1 rounded-md bg-neutral-50 dark:bg-neutral-800">
											Action: {currentItem.action}
										</span>
									</div>
								</div>
							</div>
						</div>
					) : (
						<div className="flex items-start gap-3 py-1">
							<div className="mt-1 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-full shadow-sm border border-neutral-200 dark:border-neutral-700 hidden sm:block">
								{currentItem.icon}
							</div>
							<div>
								<h4 className="font-bold text-base text-ink font-sans mb-1">{currentItem.title}</h4>
								<p className="text-sm text-news leading-relaxed">{currentItem.message}</p>
							</div>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
