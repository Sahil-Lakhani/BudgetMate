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

export function formatCurrency(amount, currencyCode = 'EUR') {
  const symbol = getCurrencySymbol(currencyCode)
  return `${symbol}${parseFloat(amount || 0).toFixed(2)}`
}
