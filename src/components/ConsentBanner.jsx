import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { useConsent, OPTIONAL_SERVICES } from "../context/ConsentContext"
import { Button } from "./Button"

// Shown until the user decides. "Accept all" and "Reject all" are equally prominent;
// nothing optional loads before a choice is made.
export function ConsentBanner() {
  const { decided, acceptAll, rejectAll, openPreferences, preferencesOpen } = useConsent()
  if (preferencesOpen) return <ConsentPreferences />
  if (decided) return null

  return (
    <div
      role="region"
      aria-label="Cookie and privacy choices"
      className="fixed inset-x-0 bottom-0 'z-[60]' border-t border-border bg-card text-ink shadow-2xl"
    >
      <div className="mx-auto max-w-5xl p-4 sm:p-5 flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex-1 space-y-1 text-sm">
          <p className="font-semibold text-base">Your privacy choices</p>
          <p className="text-news">
            BudgetMate only uses storage that is needed to sign you in and remember your settings. With your consent we
            also load <strong className="text-ink">Google reCAPTCHA</strong> (via Firebase App Check) to protect the app
            against bots — Google may set cookies and receive your IP address for this, including in the USA. You can
            change your choice at any time under “Cookie settings”.{" "}
            <Link to="/privacy#cookies" className="underline hover:text-ink">Learn more</Link>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap md:flex-nowrap shrink-0">
          <Button variant="secondary" className="rounded-md" onClick={openPreferences}>Manage preferences</Button>
          <Button variant="secondary" className="rounded-md" onClick={rejectAll}>Reject all</Button>
          <Button variant="secondary" className="rounded-md" onClick={acceptAll}>Accept all</Button>
        </div>
      </div>
    </div>
  )
}

function ConsentPreferences() {
  const { services, save, closePreferences, decided } = useConsent()
  const [draft, setDraft] = useState(services) // mounted fresh each time the dialog opens
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.querySelector("input, button")?.focus()
    const onKey = (e) => {
      if (e.key === "Escape" && decided) closePreferences()
      if (e.key !== "Tab" || !dialog) return
      const focusables = dialog.querySelectorAll("button, input, a[href]")
      const first = focusables[0], last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [decided, closePreferences])

  return (
    <div className="fixed inset-0 z-70 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto bg-card text-ink border border-border rounded-t-xl sm:rounded-xl shadow-2xl"
      >
        <div className="p-5 border-b border-border">
          <h2 id="consent-title" className="text-lg font-bold">Cookie & privacy settings</h2>
          <p className="text-sm text-news mt-1">
            Choose which optional services may be used. Your choice is stored on this device only.
          </p>
        </div>

        <div className="p-5 space-y-4">
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium">Strictly necessary</p>
              <span className="text-xs font-medium text-news">Always on</span>
            </div>
            <p className="text-sm text-news mt-1">
              Firebase sign-in session, your theme and currency preference, local request counters and this consent
              record. Required for the app to work — no consent needed.
            </p>
          </div>

          {OPTIONAL_SERVICES.map((s) => (
            <div key={s.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor={`consent-${s.id}`} className="font-medium cursor-pointer">{s.name}</label>
                <input
                  id={`consent-${s.id}`}
                  type="checkbox"
                  role="switch"
                  aria-checked={Boolean(draft[s.id])}
                  checked={Boolean(draft[s.id])}
                  onChange={(e) => setDraft((d) => ({ ...d, [s.id]: e.target.checked }))}
                  className="h-5 w-5 accent-current cursor-pointer"
                />
              </div>
              <p className="text-sm text-news mt-1">{s.purpose}</p>
              <p className="text-xs text-news mt-1">Provider: {s.provider}. {s.transfer}</p>
            </div>
          ))}

          <p className="text-xs text-news">
            Details: <Link to="/privacy#cookies" onClick={closePreferences} className="underline hover:text-ink">Privacy Policy</Link>
          </p>
        </div>

        <div className="p-5 border-t border-border flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          {decided && <Button variant="ghost" className="rounded-md" onClick={closePreferences}>Cancel</Button>}
          <Button variant="secondary" className="rounded-md" onClick={() => save(draft)}>Save choices</Button>
        </div>
      </div>
    </div>
  )
}
