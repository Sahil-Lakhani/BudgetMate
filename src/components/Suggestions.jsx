import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Target,
  PieChart,
  AlertCircle,
  Sparkles,
  ChevronRight,
  Calendar,
  DollarSign,
  Award,
} from "lucide-react";

const Card = ({ children, className = "" }) => (
  <div className={`bg-card rounded-lg border border-border ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

export default function BudgetSuggestions() {
  const [expenses, setExpenses] = useState([
    {
      id: 1,
      description: "Grocery shopping",
      amount: 85,
      category: "Food",
      date: "2024-12-01",
    },
    {
      id: 2,
      description: "Uber ride",
      amount: 25,
      category: "Transport",
      date: "2024-12-01",
    },
    {
      id: 3,
      description: "Netflix",
      amount: 15,
      category: "Entertainment",
      date: "2024-12-02",
    },
    {
      id: 4,
      description: "Lunch",
      amount: 45,
      category: "Food",
      date: "2024-12-02",
    },
    {
      id: 5,
      description: "Gas",
      amount: 50,
      category: "Transport",
      date: "2024-12-03",
    },
    {
      id: 6,
      description: "Movie tickets",
      amount: 35,
      category: "Entertainment",
      date: "2024-12-03",
    },
    {
      id: 7,
      description: "Dinner",
      amount: 65,
      category: "Food",
      date: "2024-12-04",
    },
    {
      id: 8,
      description: "Shopping",
      amount: 120,
      category: "Shopping",
      date: "2024-12-04",
    },
    {
      id: 9,
      description: "Coffee",
      amount: 12,
      category: "Food",
      date: "2024-12-05",
    },
    {
      id: 10,
      description: "Gym membership",
      amount: 50,
      category: "Health",
      date: "2024-12-05",
    },
    {
      id: 11,
      description: "Groceries",
      amount: 95,
      category: "Food",
      date: "2024-12-06",
    },
    {
      id: 12,
      description: "Taxi",
      amount: 18,
      category: "Transport",
      date: "2024-12-06",
    },
  ]);

  const [analyzing, setAnalyzing] = useState(false);
  const [recommendations, setRecommendations] = useState(null);

  const analyzeSpending = () => {
    setAnalyzing(true);

    setTimeout(() => {
      const analysis = generateRecommendations(expenses);
      setRecommendations(analysis);
      setAnalyzing(false);
    }, 1500);
  };

  const generateRecommendations = (expenses) => {
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
    const avgDaily = totalSpent / 30;
    const avgWeekly = avgDaily * 7;
    const avgMonthly = avgDaily * 30;

    const categoryTotals = {};
    expenses.forEach((e) => {
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.amount;
    });

    const categoryPercentages = Object.entries(categoryTotals)
      .map(([cat, total]) => ({
        category: cat,
        amount: total,
        percentage: (total / totalSpent) * 100,
      }))
      .sort((a, b) => b.amount - a.amount);

    const recentSpending = expenses
      .slice(0, 5)
      .reduce((sum, e) => sum + e.amount, 0);
    const olderSpending = expenses
      .slice(5, 10)
      .reduce((sum, e) => sum + e.amount, 0);
    const trend = recentSpending > olderSpending ? "increasing" : "decreasing";
    const trendPercent = Math.abs(
      ((recentSpending - olderSpending) / olderSpending) * 100
    );

    const conservative = avgMonthly * 0.9;
    const moderate = avgMonthly;
    const flexible = avgMonthly * 1.15;

    const insights = [];
    const topCategory = categoryPercentages[0];

    if (topCategory.percentage > 35) {
      insights.push({
        type: "warning",
        message: `${
          topCategory.category
        } spending is ${topCategory.percentage.toFixed(0)}% of your budget`,
        suggestion: `Consider reducing ${topCategory.category} expenses by 10-15%`,
      });
    }

    if (trend === "increasing") {
      insights.push({
        type: "alert",
        message: `Spending has increased by ${trendPercent.toFixed(
          0
        )}% recently`,
        suggestion: "Review recent purchases and identify non-essential items",
      });
    } else {
      insights.push({
        type: "success",
        message: `Great job! Spending decreased by ${trendPercent.toFixed(0)}%`,
        suggestion: "Keep up the good work and maintain these habits",
      });
    }

    const savingTips = [];
    categoryPercentages.forEach((cat) => {
      if (cat.category === "Food" && cat.percentage > 30) {
        savingTips.push({
          category: "Food",
          potential: (cat.amount * 0.15).toFixed(2),
          tip: "Cook at home 2-3 more times per week",
        });
      }
      if (cat.category === "Entertainment" && cat.percentage > 20) {
        savingTips.push({
          category: "Entertainment",
          potential: (cat.amount * 0.2).toFixed(2),
          tip: "Try free entertainment options or reduce streaming services",
        });
      }
      if (cat.category === "Transport" && cat.percentage > 15) {
        savingTips.push({
          category: "Transport",
          potential: (cat.amount * 0.25).toFixed(2),
          tip: "Consider carpooling or public transportation",
        });
      }
    });

    return {
      totalSpent,
      avgDaily: avgDaily.toFixed(2),
      avgWeekly: avgWeekly.toFixed(2),
      avgMonthly: avgMonthly.toFixed(2),
      trend,
      trendPercent: trendPercent.toFixed(0),
      budgetTiers: {
        conservative: conservative.toFixed(2),
        moderate: moderate.toFixed(2),
        flexible: flexible.toFixed(2),
      },
      categoryBreakdown: categoryPercentages,
      insights,
      savingTips,
      topSpendingCategory: topCategory,
    };
  };

  useEffect(() => {
    analyzeSpending();
  }, []);

  if (!recommendations) {
    return (
      <div className="min-h-screen bg-paper p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-news text-lg font-sans">
            Analyzing your spending patterns...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-6xl mx-auto">
        


        {/* Insights */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2 font-sans">
            <Lightbulb className="text-primary" />
            Smart Insights
          </h2>

          <div className="space-y-3">
            {recommendations.insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === "warning"
                    ? "bg-yellow-50 border-yellow-500"
                    : insight.type === "alert"
                    ? "bg-red-50 border-red-500"
                    : "bg-green-50 border-green-500"
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertCircle
                    className={`mt-1 ${
                      insight.type === "warning"
                        ? "text-yellow-600"
                        : insight.type === "alert"
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                    size={20}
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-news mb-1 font-sans">
                      {insight.message}
                    </p>
                    <p className="text-sm text-news font-sans">
                      {insight.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Saving Tips */}
        {recommendations.savingTips.length > 0 && (
          <Card className="p-6">
            <h2 className="text-2xl font-bold font-sans text-ink mb-2 flex items-center gap-2">
              <Target className="text-secondary" />
              Potential Savings Opportunities
            </h2>
            <p className="text-news mb-6 font-sans">
              Small changes that could save you money each month
            </p>

            <div className="space-y-4">
              {recommendations.savingTips.map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-card border border-border rounded-lg p-5 hover:border-primary transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-ink font-sans">
                      {tip.category}
                    </span>
                    <span className="text-secondary font-bold text-lg font-sans">
                      +${tip.potential}/mo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-news">
                    <ChevronRight size={16} />
                    <p className="text-sm font-sans">{tip.tip}</p>
                  </div>
                </div>
              ))}

              <div className="bg-secondary text-white rounded-lg p-4 mt-4">
                <p className="font-bold mb-1 font-sans">
                  Total Potential Savings
                </p>
                <p className="text-2xl font-bold font-sans">
                  $
                  {recommendations.savingTips
                    .reduce((sum, tip) => sum + parseFloat(tip.potential), 0)
                    .toFixed(2)}
                  /month
                </p>
                <p className="text-sm opacity-90 mt-2 font-sans">
                  ≈ $
                  {(
                    recommendations.savingTips.reduce(
                      (sum, tip) => sum + parseFloat(tip.potential),
                      0
                    ) * 12
                  ).toFixed(2)}
                  /year
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Refresh Button */}
        {/* <div className="mt-6 text-center">
          <button
            onClick={analyzeSpending}
            disabled={analyzing}
            className="bg-primary text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 font-sans"
          >
            {analyzing ? "Analyzing..." : "Refresh Analysis"}
          </button>
        </div> */}
      </div>
    </div>
  );
}
