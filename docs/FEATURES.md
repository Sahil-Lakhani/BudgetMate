# BudgetMate — Feature Ideas

A living document of planned and proposed features. Grouped by theme.

---

## 1. Bill Splitting

> **Core idea:** After scanning a receipt, the payer can split the bill with friends — equally or by assigning individual amounts per person.

### User Flow
1. Payer scans receipt (or adds transaction manually)
2. On the review/save screen, a new **"Split Bill"** button appears
3. Payer adds friends by email or from a saved contacts list
4. Payer chooses a split method:
   - **Equal split** — total divided evenly across all participants
   - **Custom split** — assign a specific amount or percentage to each person
   - **Item-based split** — assign individual line items from the receipt to specific people
5. Each participant sees the split in their own BudgetMate account under a **"Splits"** tab
6. Participants can mark their share as **paid** or **pending**
7. Payer sees a live balance dashboard (who owes what, who has paid)

### Sub-features
- **Friend contacts** — save frequently-split-with people so you don't retype emails every time
- **Split history** — dedicated view showing all past splits, open balances, and settled ones
- **Settlement tracking** — mark a share as "settled" (cash, Venmo, etc.) without in-app payments
- **Reminder** — optional nudge to friends who haven't marked their share as paid
- **Group splits** — name a group (e.g. "Roommates") and reuse it for recurring bills
- **Recurring bill split** — for monthly bills like rent or utilities, auto-split and remind monthly
- **Split from any transaction** — not just scanned receipts; manual transactions can also be split

---

## 2. AI Enhancements

> Extend the existing Gemini integration beyond receipt scanning.

- **Smart category suggestions** — when adding a transaction manually, Gemini suggests the category based on merchant name
- **Spending forecast** — based on past months, predict end-of-month spend for each category
- **Budget recommendations** — after 3 months of data, AI suggests a realistic savings goal
- **Unusual spending alert** — flag transactions that are significantly higher than the average for that merchant/category
- **Natural language query** — ask "how much did I spend on coffee last month?" and get an answer without navigating to Analytics

---

## 3. Social / Friends

> Features that make BudgetMate useful for shared finances.

- **Friend profiles** — add friends by email, see their display name / avatar pulled from their Google account
- **Shared expense groups** — a group (e.g. household, trip) where all members can add expenses and see a shared balance
- **Trip mode** — temporary group for a trip; auto-archives when the trip end date passes
- **IOU tracker** — lightweight "you owe me" tracker separate from full transaction splitting

---

## 4. Analytics & Insights

> Richer data views beyond the current bar chart.

- **Category budget limits** — set a monthly spend cap per category; get alerted when approaching it
- **Merchant history** — tap any merchant in a transaction to see all past purchases there + price trends
- **Year-in-review** — December feature: full-year spending summary with category breakdowns
- **Export to CSV / PDF** — download transaction history for tax purposes or personal records
- **Comparison mode** — compare any two months side by side
- **Savings progress tracker** — visual progress bar towards a savings goal amount

---

## 5. Notifications & Reminders

> Keep users engaged without being annoying.

- **Monthly budget alert** — notify when 80% of the monthly spendable budget is used
- **Bill reminder** — add recurring bills (rent, subscriptions) and get reminded 3 days before
- **Split payment reminder** — nudge friends who have an unsettled share
- **Weekly digest** — optional Sunday summary of the week's spending

---

## 6. Scan & Data Entry

> Make capturing expenses faster and more accurate.

- **Multi-receipt scan** — scan multiple receipts in one session; each becomes a separate transaction
- **Bank statement import** — upload a PDF or CSV bank statement and auto-parse transactions
- **Barcode / QR scan** — scan a store loyalty QR to auto-fill merchant name
- **Voice entry** — "I spent €4.50 on coffee at Starbucks" → auto-creates a transaction
- **Recurring transaction templates** — create a template for repeating expenses (e.g. monthly gym fee)
---

## 7. Settings & Personalisation

> Make the app feel more personal.

- **Multiple currency wallets** — track expenses in different currencies simultaneously (e.g. for travel)
- **Dark/light mode schedule** — auto-switch based on time of day
- **Custom categories** — add, rename, or merge categories beyond the default set
- **Budget periods** — switch from calendar month to custom period (e.g. pay cycle)
- **Data backup / restore** — export and reimport all transaction data (Firebase-to-Firebase or JSON)
- **PIN / biometric lock** — require authentication before opening the app on shared devices

---

## Priority Order (suggested)

| # | Feature | Effort | Value |
|---|---------|--------|-------|
| 1 | Bill Splitting (equal + custom) | High | High |
| 2 | Category budget limits + alerts | Low | High |
| 3 | Recurring transaction templates | Medium | High |
| 4 | Export to CSV | Low | Medium |
| 5 | Smart category suggestions (AI) | Low | Medium |
| 6 | Merchant history view | Medium | Medium |
| 7 | Group splits / trip mode | High | Medium |
| 8 | Bank statement import | High | Medium |
