import { useEffect } from "react"
import { Link } from "react-router-dom"
import { usePageTitle } from "../lib/usePageTitle"

export default function NotFound() {
  usePageTitle("Page not found")

  // Soft 404 (the SPA is served for every path): keep it out of search results
  useEffect(() => {
    const meta = document.createElement("meta")
    meta.name = "robots"
    meta.content = "noindex"
    document.head.appendChild(meta)
    return () => meta.remove()
  }, [])

  return (
    <div className="py-16 text-center space-y-4">
      <p className="text-sm font-medium text-news">404</p>
      <h1 className="text-3xl font-bold text-ink">Page not found</h1>
      <p className="text-news">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/" className="inline-flex h-10 items-center justify-center px-4 bg-ink text-paper text-sm font-medium rounded-md hover:bg-ink/90">
        Go to dashboard
      </Link>
    </div>
  )
}
