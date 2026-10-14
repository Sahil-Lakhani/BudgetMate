import { Loader2 } from "lucide-react"

export function PageLoader({ label = "Loading…" }) {
  return (
    <div role="status" className="flex min-h-[40vh] items-center justify-center gap-2 text-news">
      <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
