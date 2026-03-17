import { useState, useRef, useEffect } from "react"
import { ChevronDown, Check } from "lucide-react"
import { cn } from "../lib/utils"

/**
 * Custom styled dropdown that matches the app design system.
 * Props:
 *   value       — currently selected value
 *   onChange    — called as onChange({ target: { value } }) for compatibility
 *   options     — array of { value, label }
 *   className   — extra classes on the root wrapper
 */
export function Select({ value, onChange, options = [], className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  const selected = options.find(o => o.value === value)

  const handleSelect = (val) => {
    onChange({ target: { value: val } })
    setOpen(false)
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex h-10 w-full items-center justify-between border border-border bg-card text-ink px-3 py-2 text-sm rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 transition-colors"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-news transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-[8px] border border-border bg-card shadow-lg overflow-hidden">
          <div className="max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm text-ink hover:bg-news-light/40 transition-colors",
                  value === opt.value && "font-medium"
                )}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
