export const CURRENCIES = [
  { code: 'EUR', symbol: '€', label: 'Euro (EUR)' },
  { code: 'USD', symbol: '$', label: 'US Dollar (USD)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (GBP)' },
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (INR)' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen (JPY)' },
  { code: 'CAD', symbol: 'CA$', label: 'Canadian Dollar (CAD)' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar (AUD)' },
]

export function getCurrencySymbol(code) {
  return CURRENCIES.find(c => c.code === code)?.symbol || '€'
}

// Intl handles the sign placement (-€12.00, not €-12.00), thousands separators and
// currencies without minor units (¥1,200, not ¥1200.00)
const formatters = {}
export function formatCurrency(amount, currencyCode = 'EUR') {
  const code = CURRENCIES.some(c => c.code === currencyCode) ? currencyCode : 'EUR'
  formatters[code] ??= new Intl.NumberFormat('en', { style: 'currency', currency: code })
  const value = parseFloat(amount)
  return formatters[code].format(Number.isFinite(value) ? value : 0)
}
