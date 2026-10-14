import { Component } from "react"
import { useLocation } from "react-router-dom"

// Catches render errors so users see a recovery screen instead of a blank page.
// Technical details go to the console only.
export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidUpdate(prevProps) {
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) this.setState({ hasError: false })
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    // A new deploy removes old code chunks; a reload fetches the current ones
    return (
      <div role="alert" className="min-h-[60vh] flex flex-col items-center justify-center gap-4 p-6 text-center text-ink">
        <h2 className="text-2xl font-bold">Something went wrong</h2>
        <p className="text-news max-w-sm">
          An unexpected error occurred. Your saved data is safe. Reloading the page usually fixes this.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="h-10 px-4 bg-ink text-paper text-sm font-medium rounded-md hover:bg-ink/90"
          >
            Reload page
          </button>
          <a href="/" className="h-10 px-4 inline-flex items-center border border-border text-sm font-medium rounded-md hover:bg-news-light/20">
            Go to start
          </a>
        </div>
      </div>
    )
  }
}

// Resets after navigation so one broken page doesn't take down the rest of the app
export function RouteErrorBoundary({ children }) {
  const { pathname } = useLocation()
  return <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
}
