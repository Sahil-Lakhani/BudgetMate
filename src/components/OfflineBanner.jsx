import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener("online", on)
    window.addEventListener("offline", off)
    return () => {
      window.removeEventListener("online", on)
      window.removeEventListener("offline", off)
    }
  }, [])

  if (online) return null
  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[80] bg-amber-500 text-black text-sm font-medium px-4 py-2 flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" aria-hidden="true" />
      You're offline. Changes can't be saved until your connection is back.
    </div>
  )
}
