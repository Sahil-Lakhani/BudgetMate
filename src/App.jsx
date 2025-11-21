import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Expenses from "./pages/Expenses"
import Scan from "./pages/Scan"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import Login from "./pages/Login"
import { ProtectedRoute } from "./components/ProtectedRoute"

import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/expenses" element={<Expenses />} />
                      <Route path="/scan" element={<Scan />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
