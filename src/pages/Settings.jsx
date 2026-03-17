// TODO: Github and Linkedin icons are deprecated, remove them later.

import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Select } from "../components/Select"
import { useAuth } from "../context/AuthContext"
import { useCurrency } from "../context/CurrencyContext"
import { CURRENCIES } from "../lib/currency"
import { LogOut, Github, Linkedin } from "lucide-react"

export default function Settings() {
  const { user, logout } = useAuth()
  const { currency, updateCurrency } = useCurrency()

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-sans font-bold mb-2 text-ink">Settings</h2>
        <p className="text-news">Manage your account and preferences.</p>
      </div>

      {user && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-news-light overflow-hidden flex items-center justify-center">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none'
                        e.target.nextSibling.style.display = 'flex'
                      }}
                    />
                  ) : null}
                  <span
                    className="text-xl font-bold text-ink"
                    style={{ display: user.photoURL ? 'none' : 'flex' }}
                  >
                    {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-sans capitalize text-ink">{user.displayName}</h3>
                  <p className="text-xl text-news">{user.email}</p>
                </div>
              </div>
              <Button variant="secondary" onClick={logout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Currency</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-news mb-3">Choose how amounts are displayed across the app.</p>
              <Select
                value={currency}
                onChange={(e) => updateCurrency(e.target.value)}
                options={CURRENCIES.map(c => ({ value: c.code, label: c.label }))}
              />
            </CardContent>
          </Card>

          <div className="text-center text-sm text-news space-y-1">
            <div className="flex justify-center gap-4 pt-2">
              <a
                href="https://github.com/Sahil-Lakhani"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-blue-500 transition"
              >
                <Github className="w-6 h-6" />
              </a>
              <a
                href="https://www.linkedin.com/in/YOUR-LINKEDIN-USERNAME"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink hover:text-blue-500 transition"
              >
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
            <p className="font-medium">Developed by Sahil</p>
            <p className="text-muted-foreground">Version 1.0</p>
          </div>
        </>
      )}
    </div>
  )
}
