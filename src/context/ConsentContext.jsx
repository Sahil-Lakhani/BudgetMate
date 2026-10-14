import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { enableAppCheck, isAppCheckStarted } from "../lib/firebase"

// Optional services that need consent before they load (§ 25 TDDDG / Art. 6(1)(a) GDPR).
// Strictly necessary storage (sign-in session, theme, this consent record) needs no consent.
// Bump CONSENT_VERSION whenever this list changes so everyone is asked again.
export const CONSENT_VERSION = 1
export const OPTIONAL_SERVICES = [
  {
    id: "recaptcha",
    name: "Google reCAPTCHA (via Firebase App Check)",
    provider: "Google Ireland Ltd. / Google LLC",
    purpose:
      "Checks that requests to our database come from the real BudgetMate app and not from bots or abuse scripts. " +
      "Google may set cookies and processes device and usage data (e.g. IP address, browser details, interactions) for this.",
    transfer: "Data may be transferred to the USA (EU-U.S. Data Privacy Framework).",
  },
]

const STORAGE_KEY = "bm_consent"
const ConsentContext = createContext(null)

function readStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null")
    return parsed?.version === CONSENT_VERSION ? parsed : null
  } catch {
    return null
  }
}

export function ConsentProvider({ children }) {
  const [record, setRecord] = useState(readStored)
  const [preferencesOpen, setPreferencesOpen] = useState(false)

  // Start optional services only after consent
  useEffect(() => {
    if (record?.services?.recaptcha) enableAppCheck()
  }, [record])

  const save = useCallback((services) => {
    const next = { version: CONSENT_VERSION, services, decidedAt: new Date().toISOString() }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* private mode: keep in memory */ }
    setRecord(next)
    setPreferencesOpen(false)

    // App Check cannot be switched off at runtime: clear its stored token and reload
    if (!services.recaptcha && isAppCheckStarted()) {
      try { indexedDB.deleteDatabase("firebase-app-check-database") } catch { /* ignore */ }
      window.location.reload()
    }
  }, [])

  const all = (value) => Object.fromEntries(OPTIONAL_SERVICES.map((s) => [s.id, value]))

  const value = {
    decided: Boolean(record),
    services: record?.services ?? all(false),
    decidedAt: record?.decidedAt ?? null,
    acceptAll: () => save(all(true)),
    rejectAll: () => save(all(false)),
    save,
    preferencesOpen,
    openPreferences: () => setPreferencesOpen(true),
    closePreferences: () => setPreferencesOpen(false),
  }

  return <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
}

export function useConsent() {
  const ctx = useContext(ConsentContext)
  if (!ctx) throw new Error("useConsent must be used within a ConsentProvider")
  return ctx
}
