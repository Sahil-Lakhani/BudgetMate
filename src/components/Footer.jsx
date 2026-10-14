import { Link } from "react-router-dom"
import { useConsent } from "../context/ConsentContext"
import { cn } from "../lib/utils"

export function Footer({ className }) {
  const { openPreferences } = useConsent()
  const linkClass = "inline-flex items-center min-h-6 px-1 hover:text-ink underline-offset-4 hover:underline"

  return (
    <footer className={cn("text-xs text-news", className)}>
      <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link to="/privacy" className={linkClass}>Privacy Policy</Link>
        <Link to="/imprint" className={linkClass}>Impressum</Link>
        <Link to="/terms" className={linkClass}>Terms</Link>
        <button type="button" onClick={openPreferences} className={linkClass}>Cookie settings</button>
      </nav>
      <p className="text-center mt-2">© {new Date().getFullYear()} BudgetMate</p>
    </footer>
  )
}
