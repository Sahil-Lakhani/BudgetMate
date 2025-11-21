import { cn } from "../lib/utils"

export function Button({ className, variant = "primary", size = "default", children, ...props }) {
  const variants = {
    primary: "bg-ink text-paper hover:bg-ink/90 dark:bg-ink dark:text-paper dark:hover:bg-ink/90",
    secondary: "bg-card text-ink border border-border hover:bg-news-light/20",
    ghost: "hover:bg-news-light/20 text-ink",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground border-border text-ink hover:bg-news-light/20",
  }

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8",
    icon: "h-10 w-10",
  }

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
