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

// Intl handles thousands separators and currencies without minor units (¥1,200, not ¥1200.00).
// The sign is added here instead, with a non-breaking space so it never touches the symbol
// (− €12.00, not -€12.00). `signed: true` also marks positive amounts (+ €12.00).
const formatters = {}
const SIGN_GAP = ' '
export function formatCurrency(amount, currencyCode = 'EUR', { signed = false } = {}) {
  const code = CURRENCIES.some(c => c.code === currencyCode) ? currencyCode : 'EUR'
  formatters[code] ??= new Intl.NumberFormat('en', { style: 'currency', currency: code })
  const parsed = parseFloat(amount)
  const value = Number.isFinite(parsed) ? parsed : 0
  const body = formatters[code].format(Math.abs(value))
  if (value < 0) return `−${SIGN_GAP}${body}`
  if (signed && value > 0) return `+${SIGN_GAP}${body}`
  return body
}
