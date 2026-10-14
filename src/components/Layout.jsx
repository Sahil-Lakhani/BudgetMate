import { Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Receipt, ScanLine, PieChart, Settings, Menu, X, Sun, Moon, LogOut, Users } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import { Button } from "./Button"
import { Footer } from "./Footer"

import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import { getUserNotifications, NOTIFICATIONS_CHANGED_EVENT } from "../lib/firestore"

export function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const onKey = (e) => { if (e.key === "Escape") setIsMobileMenuOpen(false) }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [isMobileMenuOpen])

  // Re-count on route change and whenever notifications are marked read
  useEffect(() => {
    if (!user) return
    const recount = () =>
      getUserNotifications(user.uid)
        .then((notifs) => setUnreadCount(notifs.length))
        .catch(() => {})
    recount()
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, recount)
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, recount)
  }, [user, location.pathname])

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Receipt, label: "Expenses", path: "/expenses" },
    { icon: ScanLine, label: "Scan", path: "/scan" },
    { icon: Users, label: "Groups", path: "/groups", badge: unreadCount },
    { icon: PieChart, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

  return (
    <div className="min-h-screen md:h-screen bg-paper flex flex-col md:flex-row transition-colors duration-300 md:overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-2 text-xl font-sans font-bold text-ink"><img src="/favicon.svg" alt="" className="h-6 w-6 rounded-md" />BudgetMate</Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={isMobileMenuOpen}
            aria-controls="app-sidebar"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        aria-label="Main navigation"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5 text-2xl font-sans font-bold text-ink"><img src="/favicon.svg" alt="" className="h-7 w-7 rounded-md" />BudgetMate</Link>
          <p className="text-xs text-news mt-1 uppercase tracking-wider">{new Date().toLocaleDateString(undefined, { dateStyle: "medium" })}</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
              || (item.path !== "/" && location.pathname.startsWith(item.path + "/"))
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-all duration-150",
                  isActive
                    ? "bg-ink text-paper"
                    : "text-ink/60 hover:text-ink hover:bg-ink/8"
                )}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                {item.badge > 0 && (
                  <span aria-label={`${item.badge} unread`} className="ml-auto bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-2 mb-2">
              {user.photoURL && (
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full" />
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
                <p className="text-xs text-news truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full justify-start gap-2 hidden md:flex" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={logout}>
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          aria-hidden="true"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main id="main-content" tabIndex={-1} className="flex-1 p-4 pb-24 md:p-8 overflow-auto bg-paper md:overflow-y-auto focus:outline-none">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
        <Footer className="max-w-5xl mx-auto mt-12 pt-6 border-t border-border" />
      </main>

      {/* Quick Scan FAB (Mobile Only) */}
      {location.pathname !== "/scan" && (
        <Button
          className="fixed bottom-6 right-6 z-50 md:hidden h-14 w-14 rounded-full shadow-lg p-0"
          onClick={() => document.getElementById('quick-scan-input').click()}
          aria-label="Scan a receipt"
        >
          <ScanLine className="h-6 w-6" aria-hidden="true" />
          <input
            id="quick-scan-input"
            type="file"
            className="hidden"
            accept="image/*"
            {...(/Android/i.test(navigator.userAgent) ? { capture: "environment" } : {})}
            onChange={(e) => {
              const file = e.target.files[0]
              e.target.value = ""
              if (file) {
                navigate("/scan", { state: { file } })
              }
            }}
          />
        </Button>
      )}
    </div>
  )
}
