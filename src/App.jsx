import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Layout } from "./components/Layout"
import { ProtectedRoute } from "./components/ProtectedRoute"
import { ErrorBoundary, RouteErrorBoundary } from "./components/ErrorBoundary"
import { ConsentBanner } from "./components/ConsentBanner"
import { OfflineBanner } from "./components/OfflineBanner"
import { PageLoader } from "./components/PageLoader"

import { AuthProvider } from "./context/AuthContext"
import { ThemeProvider } from "./context/ThemeContext"
import { CurrencyProvider } from "./context/CurrencyContext"
import { ConsentProvider } from "./context/ConsentContext"

// Route-level code splitting keeps three.js (login background) and recharts off the critical path
const Dashboard = lazy(() => import("./pages/Dashboard"))
const Expenses = lazy(() => import("./pages/Expenses"))
const TransactionDetails = lazy(() => import("./pages/TransactionDetails"))
const AddTransaction = lazy(() => import("./pages/AddTransaction"))
const Scan = lazy(() => import("./pages/Scan"))
const Analytics = lazy(() => import("./pages/Analytics"))
const Settings = lazy(() => import("./pages/Settings"))
const Groups = lazy(() => import("./pages/Groups"))
const CreateGroup = lazy(() => import("./pages/CreateGroup"))
const GroupDetail = lazy(() => import("./pages/GroupDetail"))
const AddSplit = lazy(() => import("./pages/AddSplit"))
const SplitScreen = lazy(() => import("./pages/SplitScreen"))
const SplitDetail = lazy(() => import("./pages/SplitDetail"))
const Login = lazy(() => import("./pages/Login"))
const NotFound = lazy(() => import("./pages/NotFound"))
const Privacy = lazy(() => import("./pages/legal/Privacy"))
const Imprint = lazy(() => import("./pages/legal/Imprint"))
const Terms = lazy(() => import("./pages/legal/Terms"))

function App() {
  return (
    <ThemeProvider>
      <ConsentProvider>
        <AuthProvider>
          <CurrencyProvider>
            <Router>
              <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:bg-card focus:text-ink focus:px-4 focus:py-2 focus:rounded-md focus:ring-2 focus:ring-ink">
                Skip to content
              </a>
              <OfflineBanner />
              <ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/imprint" element={<Imprint />} />
                    <Route path="/impressum" element={<Imprint />} />
                    <Route path="/terms" element={<Terms />} />

                    {/* Signed-in app */}
                    <Route
                      path="/*"
                      element={
                        <ProtectedRoute>
                          <Layout>
                            <RouteErrorBoundary>
                              <Suspense fallback={<PageLoader />}>
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
                                  <Route path="*" element={<NotFound />} />
                                </Routes>
                              </Suspense>
                            </RouteErrorBoundary>
                          </Layout>
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <ConsentBanner />
            </Router>
          </CurrencyProvider>
        </AuthProvider>
      </ConsentProvider>
    </ThemeProvider>
  )
}

export default App
