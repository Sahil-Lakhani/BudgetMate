import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/Button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/Card"

//three js shit remove later if lags check commit of 18/12/2025 
import { DotScreenShader } from "../components/dot-shader-background"

export default function Login() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate("/")
    }
  }, [user, navigate])

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background layer */}
      <div className="absolute inset-0 -z-10">
        <DotScreenShader />
      </div>

      {/* Foreground content (your existing login UI) */}
      <div className="relative w-full max-w-md p-4">
        <div className="text-center mb-8 space-y-2">
          <h1 className="text-4xl font-bold tracking-tight font-sans">
            BudgetMate
          </h1>
          <p className="text-lg text-gray-500 font-medium font-sans">
            Sort your bills in seconds
          </p>
        </div>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-sans">Welcome Back</CardTitle>
            <CardDescription>Sign in to access your budget</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button onClick={loginWithGoogle} className="w-full max-w-xs">
              Sign in with Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
