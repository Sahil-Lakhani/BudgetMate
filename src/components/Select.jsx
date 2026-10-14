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
 *   id          — id for the trigger, so a <label htmlFor> can name it
 *   aria-label  — accessible name when there is no visible label
 * Keyboard: Enter/Space/↓ opens, ↑/↓ move, Enter selects, Esc closes.
 */
export function Select({ value, onChange, options = [], className, id, "aria-label": ariaLabel }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener("mousedown", handleOutside)
    return () => document.removeEventListener("mousedown", handleOutside)
  }, [])

  // Focus the selected option when the list opens
  useEffect(() => {
    if (!open) return
    const items = listRef.current?.querySelectorAll('[role="option"]')
    const index = Math.max(0, options.findIndex((o) => o.value === value))
    items?.[index]?.focus()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const selected = options.find(o => o.value === value)

  const handleSelect = (val) => {
    onChange({ target: { value: val } })
    setOpen(false)
    triggerRef.current?.focus()
  }

  const handleListKeyDown = (e) => {
    const items = Array.from(listRef.current?.querySelectorAll('[role="option"]') || [])
    const current = items.indexOf(document.activeElement)
    if (e.key === "ArrowDown") { e.preventDefault(); items[Math.min(items.length - 1, current + 1)]?.focus() }
    else if (e.key === "ArrowUp") { e.preventDefault(); items[Math.max(0, current - 1)]?.focus() }
    else if (e.key === "Home") { e.preventDefault(); items[0]?.focus() }
    else if (e.key === "End") { e.preventDefault(); items[items.length - 1]?.focus() }
    else if (e.key === "Escape" || e.key === "Tab") { setOpen(false); if (e.key === "Escape") triggerRef.current?.focus() }
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(prev => !prev)}
        onKeyDown={(e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); setOpen(true) } }}
        className="flex h-10 w-full items-center justify-between border border-border bg-card text-ink px-3 py-2 text-sm rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 transition-colors"
      >
        <span>{selected?.label ?? value}</span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-news transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown list */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full rounded-[8px] border border-border bg-card shadow-lg overflow-hidden"
          role="listbox"
          aria-label={ariaLabel}
          onKeyDown={handleListKeyDown}
        >
          <div className="max-h-60 overflow-y-auto">
            {options.map(opt => (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={value === opt.value}
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2.5 text-sm text-ink hover:bg-news-light/40 focus:bg-news-light/40 focus:outline-none transition-colors",
                  value === opt.value && "font-medium"
                )}
              >
                <span>{opt.label}</span>
                {value === opt.value && (
                  <Check className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
