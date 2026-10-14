import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Local calendar date/month. toISOString() is UTC and shifts dates near midnight —
// and first-of-month dates by a whole month — for users east of UTC (e.g. Germany).
const pad = (n) => String(n).padStart(2, "0")
export const localMonth = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
// Line-item total; older entries may only have a unit price
export const itemTotal = (item) => {
  const total = parseFloat(item?.totalPrice)
  if (Number.isFinite(total)) return total
  return (parseFloat(item?.price) || 0) * (parseFloat(item?.quantity) || 1)
}

export const localDate = (d = new Date()) => `${localMonth(d)}-${pad(d.getDate())}`
