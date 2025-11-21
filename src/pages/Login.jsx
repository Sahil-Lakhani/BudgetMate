import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { Button } from "../components/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/Card"

export default function Login() {
  const { user, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate("/")
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-serif">Welcome Back</CardTitle>
          <CardDescription>Sign in to access your budget</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-8">
          <Button onClick={loginWithGoogle} className="w-full max-w-xs">
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
