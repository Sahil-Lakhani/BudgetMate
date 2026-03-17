import { createContext, useContext, useState, useEffect } from 'react'
import { getUserSettings, updateUserSettings } from '../lib/firestore'
import { formatCurrency as _formatCurrency } from '../lib/currency'
import { useAuth } from './AuthContext'

const CurrencyContext = createContext()

export function CurrencyProvider({ children }) {
  const { user } = useAuth()
  const [currency, setCurrency] = useState('EUR')

  useEffect(() => {
    if (!user?.uid) { setCurrency('EUR'); return }
    getUserSettings(user.uid)
      .then(settings => { if (settings?.currency) setCurrency(settings.currency) })
      .catch(() => {})
  }, [user])

  // Updates both local state and Firestore (for Settings page)
  const updateCurrency = async (code) => {
    setCurrency(code)
    if (user?.uid) {
      try {
        await updateUserSettings(user.uid, { currency: code })
      } catch (e) {
        console.error('Failed to save currency', e)
      }
    }
  }

  const formatCurrency = (amount) => _formatCurrency(amount, currency)

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, updateCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyContext)
