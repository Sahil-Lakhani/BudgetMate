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
import Groups from "./pages/Groups"
import CreateGroup from "./pages/CreateGroup"
import GroupDetail from "./pages/GroupDetail"
import AddSplit from "./pages/AddSplit"
import SplitScreen from "./pages/SplitScreen"
import SplitDetail from "./pages/SplitDetail"
import Login from "./pages/Login"
import { ProtectedRoute } from "./components/ProtectedRoute"

import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { CurrencyProvider } from "./context/CurrencyContext"

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
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
                      <Route path="/groups" element={<Groups />} />
                      <Route path="/groups/new" element={<CreateGroup />} />
                      <Route path="/groups/:groupId" element={<GroupDetail />} />
                      <Route path="/groups/:groupId/split/new" element={<AddSplit />} />
                      <Route path="/groups/:groupId/split/:splitId/screen" element={<SplitScreen />} />
                      <Route path="/groups/:groupId/split/:splitId" element={<SplitDetail />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
