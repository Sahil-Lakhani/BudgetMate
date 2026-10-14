// Browser-stored data tied to a signed-in user. Cleared on sign-out and account deletion
// so the next person using this device never sees it. Theme and consent are device-level and kept.
const USER_KEY_PREFIXES = ["insights_", "rateLimit_"]

export const insightsCacheKey = (uid, monthKey) => `insights_${uid}_${monthKey}`

export function clearLocalUserData() {
  try {
    Object.keys(localStorage)
      .filter((key) => USER_KEY_PREFIXES.some((prefix) => key.startsWith(prefix)))
      .forEach((key) => localStorage.removeItem(key))
  } catch {
    // storage unavailable (private mode) — nothing to clear
  }
}
