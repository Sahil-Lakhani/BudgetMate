import { cn } from "../lib/utils"

export function Input({ className, type, ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full border border-border bg-transparent text-ink px-3 py-2 text-sm placeholder:text-news focus-visible:outline-none focus-visible:border-ink transition-colors disabled:cursor-not-allowed disabled:opacity-50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className
      )}
      {...props}
    />
  )
}
