import { Users } from "lucide-react"
import { cn } from "../lib/utils"

// Small pill shown on ledger entries that came from a group split.
// Renders nothing for ordinary transactions.
export function SplitTag({ transaction, className }) {
  if (transaction?.source !== "split") return null
  const refund = transaction.type === "refund"
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none shrink-0",
        refund
          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          : "bg-ink/10 text-ink",
        className
      )}
    >
      <Users className="h-3 w-3" />
      {refund ? "Split refund" : "Split expense"}
    </span>
  )
}
