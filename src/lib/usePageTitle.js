import { useEffect } from "react"

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} — BudgetMate` : "BudgetMate"
    return () => { document.title = "BudgetMate" }
  }, [title])
}
