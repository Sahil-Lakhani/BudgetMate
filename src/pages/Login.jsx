import { lazy, Suspense, useEffect, useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { usePageTitle } from "../lib/usePageTitle"
import { Button } from "../components/Button"
import { Footer } from "../components/Footer"
import Logo from "../components/Logo"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/Card"

// three.js background: loaded separately so the sign-in form renders first
const DotScreenShader = lazy(() =>
  import("../components/dot-shader-background").then((m) => ({ default: m.DotScreenShader }))
)

function usePrefersReducedMotion() {
  const query = "(prefers-reduced-motion: reduce)"
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = () => setReduced(mql.matches)
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])
  return reduced
}

export default function Login() {
  usePageTitle(null) // keeps "BudgetMate" as-is — matches og:title for the landing page
  const { user, loginWithGoogle, loginError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const reducedMotion = usePrefersReducedMotion()
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (user) {
      const from = location.state?.from
      navigate(typeof from === "string" && from.startsWith("/") && !from.startsWith("//") ? from : "/", { replace: true })
    }
  }, [user, navigate, location.state])

  const handleLogin = async () => {
    setSigningIn(true)
    await loginWithGoogle()
    setSigningIn(false)
  }

  return (
    <div className="dark relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#121212] text-white">
      {/* Background layer */}
      {!reducedMotion && (
        <div className="absolute inset-0 -z-0" aria-hidden="true">
          <Suspense fallback={null}>
            <DotScreenShader />
          </Suspense>
        </div>
      )}

      <main id="main-content" className="relative w-full max-w-md p-4 flex-1 flex flex-col justify-center">
        <div className="text-center mb-8 space-y-2">
          <Logo className="h-[72px] mx-auto mb-5 text-zinc-50" title="" />
          <h1 className="text-4xl font-bold tracking-tight font-sans text-white">
            BudgetMate
          </h1>
          <p className="text-lg text-zinc-300 font-medium font-sans">
            Track expenses, scan receipts and split bills
          </p>
        </div>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-sans">Welcome</CardTitle>
            <CardDescription>Sign in with your Google account to continue</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4 pb-8">
            <Button onClick={handleLogin} disabled={signingIn} className="w-full max-w-xs rounded-md">
              {signingIn ? "Signing in…" : "Sign in with Google"}
            </Button>
            {loginError && (
              <p role="alert" className="text-sm text-red-400 text-center">{loginError}</p>
            )}
            <p className="text-xs text-news text-center max-w-xs">
              By signing in you agree to our <Link to="/terms" className="underline hover:text-ink">Terms</Link>.
              Learn how we handle your data in our{" "}
              <Link to="/privacy" className="underline hover:text-ink">Privacy Policy</Link>.
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer className="relative w-full py-6 px-4 text-zinc-400" />
    </div>
  )
}
