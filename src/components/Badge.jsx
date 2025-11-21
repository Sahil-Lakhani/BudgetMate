import { cn } from "../lib/utils"

export function Badge({ className, variant = "default", children, ...props }) {
  const variants = {
    default: "border-transparent bg-ink text-white hover:bg-ink/80",
    secondary: "border-transparent bg-news-light text-ink hover:bg-news-light/80",
    outline: "text-ink border-ink border-2",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
