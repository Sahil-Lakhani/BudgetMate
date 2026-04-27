import { cn } from "../lib/utils"

export function SplitRow({ participant, amount, isActive, onToggle, onAmountChange, currencySymbol, isLastActive }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-3 border-b border-border last:border-0 transition-opacity",
      !isActive && "opacity-40"
    )}>
      {participant.photoURL ? (
        <img src={participant.photoURL} alt={participant.displayName} className="w-9 h-9 rounded-full shrink-0" />
      ) : (
        <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center text-sm font-bold text-ink shrink-0">
          {(participant.displayName || participant.email || "?")[0].toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{participant.displayName}</p>
        <p className="text-xs text-news truncate">{participant.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-news">{currencySymbol}</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={isActive ? amount : ""}
            disabled={!isActive}
            onChange={(e) => onAmountChange(parseFloat(e.target.value) || 0)}
            className="w-24 pl-5 pr-2 py-1.5 text-sm border border-border rounded-md bg-paper text-ink disabled:bg-news-light disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-ink"
          />
        </div>

        <button
          onClick={onToggle}
          disabled={isActive && isLastActive}
          title={isActive ? "Remove from split" : "Add to split"}
          className={cn(
            "w-6 h-6 rounded border-2 flex items-center justify-center transition-colors",
            isActive
              ? "bg-ink border-ink text-paper"
              : "bg-paper border-news hover:border-ink",
            isActive && isLastActive && "opacity-40 cursor-not-allowed"
          )}
        >
          {isActive && (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
