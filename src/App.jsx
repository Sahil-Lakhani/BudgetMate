// TODO: Change package name from new-folder to Budgetmate

import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import Dashboard from "./pages/Dashboard"
import Expenses from "./pages/Expenses"
import TransactionDetails from "./pages/TransactionDetails"
import AddTransaction from "./pages/AddTransaction"
import Scan from "./pages/Scan"
import Analytics from "./pages/Analytics"
import Settings from "./pages/Settings"
import Login from "./pages/Login"
import { ProtectedRoute } from "./components/ProtectedRoute"

import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
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
                      <Route path="/expenses/add" element={<AddTransaction />} />
                      <Route path="/expenses/:id" element={<TransactionDetails />} />
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
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
