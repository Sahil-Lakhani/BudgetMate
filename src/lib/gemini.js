import { auth, getAppCheckToken } from "./firebase"
import { checkRateLimit } from "./rateLimit"

// Gemini is called through our own endpoint (api/gemini.js) so the API key stays on the server.

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const MAX_EDGE = 1600

// Errors carrying this flag have a message that is safe to show to the user
export class UserFacingError extends Error {
  constructor(message) { super(message); this.userFacing = true }
}

async function callGemini(payload) {
  const user = auth.currentUser
  if (!user) throw new UserFacingError("Your session has expired. Please sign in again.")
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new UserFacingError("You appear to be offline. Check your connection and try again.")
  }

  const [token, appCheckToken] = await Promise.all([user.getIdToken(), getAppCheckToken()])
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
  if (appCheckToken) headers["X-Firebase-AppCheck"] = appCheckToken
  let response
  try {
    response = await fetch("/api/gemini", {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    })
  } catch {
    throw new UserFacingError("Couldn't reach the server. Check your connection and try again.")
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new UserFacingError(data?.error || "Something went wrong. Please try again.")
  }
  return data
}

// Re-encode as JPEG, longest edge ≤ 1600px. Keeps uploads small and drops EXIF metadata (incl. GPS).
async function prepareImage(file) {
  if (!file.type.startsWith("image/")) throw new UserFacingError("Please choose an image file (JPG, PNG, WebP or HEIC).")
  if (file.size > MAX_UPLOAD_BYTES) throw new UserFacingError("That image is larger than 15 MB. Please choose a smaller one.")

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close?.()
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
    return { data: dataUrl.split(",")[1], mimeType: "image/jpeg" }
  } catch {
    // Browser can't decode it (e.g. HEIC outside Safari): send as-is if small enough
    if (file.size > 3 * 1024 * 1024) throw new UserFacingError("This image format can't be processed here. Please use a JPG or PNG.")
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    return { data: dataUrl.split(",")[1], mimeType: file.type }
  }
}

export async function analyzeReceipt(imageFile) {
  checkRateLimit("gemini-analyze")
  const image = await prepareImage(imageFile)
  return callGemini({ action: "analyzeReceipt", image })
}

export async function generateMonthlyInsights(transactions, currency = "EUR") {
  checkRateLimit("gemini-insights")
  return callGemini({ action: "monthlyInsights", transactions, currency })
}
