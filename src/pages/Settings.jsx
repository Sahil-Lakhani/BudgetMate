import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card"
import { Button } from "../components/Button"
import { Input } from "../components/Input"
import { useAuth } from "../context/AuthContext"
import { User, Mail, Shield, LogOut, Bell, Moon } from "lucide-react"

export default function Settings() {
  const { user, login, logout } = useAuth()
  const [email, setEmail] = useState("")

  const handleLogin = (e) => {
    e.preventDefault()
    if (email) login(email)
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-3xl font-serif font-bold mb-2 text-ink">Settings</h2>
        <p className="text-news">Manage your account and preferences.</p>
      </div>

      {!user ? (
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Sign In with Email
              </Button>
              <p className="text-xs text-center text-news">
                (This is a demo. No actual authentication is performed.)
              </p>
            </form>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-news-light overflow-hidden">
                <img src={user.photoURL} alt={user.name} className="h-full w-full object-cover" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold font-serif capitalize text-ink">{user.name}</h3>
                <p className="text-news">{user.email}</p>
              </div>
              <Button variant="secondary" onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-2 hover:bg-news-light/20 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-ink" />
                  <div>
                    <p className="font-medium">Notifications</p>
                    <p className="text-xs text-news">Manage your email alerts</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-news-light/20 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Moon className="h-5 w-5 text-ink" />
                  <div>
                    <p className="font-medium">Appearance</p>
                    <p className="text-xs text-news">Customize the interface</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
              <div className="flex items-center justify-between p-2 hover:bg-news-light/20 cursor-pointer">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-ink" />
                  <div>
                    <p className="font-medium">Security</p>
                    <p className="text-xs text-news">2FA and password</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">Edit</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>About Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-ink">
                Developed by Sahil Lakhani mainly known as diecsat online.
              </p>
              <a
                href="https://github.com/Sahil-Lakhani"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline block"
              >
                https://github.com/Sahil-Lakhani
              </a>
              <div className="pt-4 border-t border-border text-center text-sm text-news">
                <p>Developed by Sahil</p>
                <p>Version 1.0</p>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
