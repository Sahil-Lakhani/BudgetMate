import { useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Footer } from "../../components/Footer"
import { usePageTitle } from "../../lib/usePageTitle"
import { LEGAL } from "../../legal/siteConfig"

// Public, readable without an account. Content is plain semantic HTML styled via `.legal`.
export function LegalLayout({ title, subtitle, children }) {
  usePageTitle(title)
  const { hash } = useLocation()

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
    else window.scrollTo(0, 0)
  }, [hash])

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      <header className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="text-lg font-bold">BudgetMate</Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-news hover:text-ink py-2">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to app
          </Link>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 legal">
        <h1>{title}</h1>
        {subtitle && <p className="text-news !mt-1">{subtitle}</p>}
        <p className="text-sm text-news">Last updated: {LEGAL.lastUpdated}</p>
        {children}
      </main>

      <Footer className="border-t border-border py-6 px-4" />
    </div>
  )
}

export function Section({ id, title, children }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined}>{title}</h2>
      {children}
    </section>
  )
}
