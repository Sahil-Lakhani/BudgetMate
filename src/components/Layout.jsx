import { Link, useLocation, useNavigate } from "react-router-dom"
import { LayoutDashboard, Receipt, ScanLine, PieChart, Settings, Menu, Sun, Moon, LogOut } from "lucide-react"
import { useState } from "react"
import { cn } from "../lib/utils"
import { Button } from "./Button"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"

export function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/" },
    { icon: Receipt, label: "Expenses", path: "/expenses" },
    { icon: ScanLine, label: "Scan", path: "/scan" },
    { icon: PieChart, label: "Analytics", path: "/analytics" },
    { icon: Settings, label: "Settings", path: "/settings" },
  ]

  return (
    <div className="min-h-screen md:h-screen bg-paper flex flex-col md:flex-row transition-colors duration-300 md:overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-border bg-card sticky top-0 z-50">
        <h1 className="text-xl font-serif font-bold text-ink">Budget Daily</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-serif font-bold text-ink">Budget Daily</h1>
          <p className="text-xs text-news mt-1 uppercase tracking-wider">Edition: {new Date().toLocaleDateString()}</p>
        </div>
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors hover:bg-news-light/50 border border-transparent rounded-md",
                  isActive ? "bg-ink text-paper border-ink" : "text-ink"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-2 mb-2">
              {user.photoURL && (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
              )}
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-ink truncate">{user.displayName}</p>
                <p className="text-xs text-news truncate">{user.email}</p>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full justify-start gap-2 hidden md:flex" onClick={toggleTheme}>
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
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-auto bg-paper md:overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>

      {/* Quick Scan FAB (Mobile Only) */}
      {location.pathname !== "/scan" && (
        <Button
          className="fixed bottom-6 right-6 z-50 md:hidden h-14 w-14 rounded-full shadow-lg p-0"
          onClick={() => document.getElementById('quick-scan-input').click()}
        >
          <ScanLine className="h-6 w-6" />
          <input
            id="quick-scan-input"
            type="file"
            className="hidden"
            accept="image/*"
            {...(/Android/i.test(navigator.userAgent) ? { capture: "environment" } : {})}
            onChange={(e) => {
              const file = e.target.files[0]
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
