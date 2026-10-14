import { createContext, useContext, useState, useEffect } from "react"
import { auth } from "../lib/firebase"
import { saveUser } from "../lib/firestore"
import { clearLocalUserData } from "../lib/localData"
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "firebase/auth"

const AuthContext = createContext()

// Map Firebase auth error codes to messages that are safe and useful to show
function loginErrorMessage(code) {
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "" // user closed the window — not an error
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in window. Please allow pop-ups for this site and try again."
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again."
    case "auth/unauthorized-domain":
      return "Sign-in isn't available on this address yet. Please try again later."
    default:
      return "Sign-in failed. Please try again."
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loginError, setLoginError] = useState("")

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) saveUser(currentUser).catch(() => {})
    })
    return () => unsubscribe()
  }, [])

  const loginWithGoogle = async () => {
    setLoginError("")
    try {
      await signInWithPopup(auth, new GoogleAuthProvider())
      // Profile is written by the onAuthStateChanged listener above
    } catch (error) {
      console.error("Error logging in with Google", error)
      setLoginError(loginErrorMessage(error?.code))
    }
  }

  const logout = async () => {
    try {
      clearLocalUserData()
      await signOut(auth)
    } catch (error) {
      console.error("Error logging out", error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loginWithGoogle, logout, loading, loginError }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
