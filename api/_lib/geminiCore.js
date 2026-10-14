// Server-side Gemini calls. The API key never reaches the browser: the client sends its
// Firebase ID token, we verify it against Google's public keys, then call Gemini here.
// Shared by the Vercel function (api/gemini.js) and the Vite dev middleware (vite.config.js).
import { createRemoteJWKSet, jwtVerify } from "jose"
import { GoogleGenerativeAI } from "@google/generative-ai"

const MODEL = "gemini-2.5-flash"
const MAX_IMAGE_BASE64 = 4_000_000 
const MAX_TRANSACTIONS = 300
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"])

const LIMITS = { analyzeReceipt: { max: 10, windowMs: 60_000 }, monthlyInsights: { max: 3, windowMs: 60_000 } }
const hits = new Map()


const RETRYABLE = new Set([429, 500, 503])
export const RETRY_DELAYS_MS = [2000, 4000]

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
)
const APP_CHECK_JWKS = createRemoteJWKSet(new URL("https://firebaseappcheck.googleapis.com/v1/jwks"))

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

async function verifyUser(authorization, projectId) {
  const token = /^Bearer (.+)$/.exec(authorization || "")?.[1]
  if (!token) throw new HttpError(401, "Sign in required")
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId
    })
    if (!payload.sub) throw new Error("no subject")
    return payload.sub
  } catch {
    throw new HttpError(401, "Your session has expired. Please sign in again.")
  }
}

export async function verifyAppCheck(token, projectNumber, enforce) {
  if (!token) {
    if (enforce) throw new HttpError(401, "This app version can't use AI features. Please update the app.")
    return
  }
  if (!projectNumber) {
    console.error("[gemini] FIREBASE_PROJECT_NUMBER is not configured; App Check token not verified")
    if (enforce) throw new HttpError(503, "This feature is temporarily unavailable.")
    return
  }
  try {
    await jwtVerify(token, APP_CHECK_JWKS, {
      issuer: `https://firebaseappcheck.googleapis.com/${projectNumber}`,
      audience: `projects/${projectNumber}`,
      algorithms: ["RS256"]
    })
  } catch {
    throw new HttpError(401, "This app version can't use AI features. Please update the app.")
  }
}

export async function generateWithRetry(model, request) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await model.generateContent(request)
    } catch (error) {
      if (!RETRYABLE.has(error?.status) || attempt >= RETRY_DELAYS_MS.length) throw error
      console.warn(`[gemini] upstream ${error.status}, retrying in ${RETRY_DELAYS_MS[attempt]} ms`)
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]))
    }
  }
}

function rateLimit(uid, action) {
  const { max, windowMs } = LIMITS[action]
  const key = `${uid}:${action}`
  const now = Date.now()
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs)
  if (recent.length >= max) throw new HttpError(429, "Too many requests. Please wait a minute and try again.")
  recent.push(now)
  hits.set(key, recent)
}

function parseJson(text) {
  const json = text.replace(/```(?:json)?\s*/gi, "").replace(/```/g, "").trim()
  return JSON.parse(json)
}

const RECEIPT_PROMPT = `Analyze this receipt image and extract the following information in JSON format:
{
  "merchant": "store/business name",
  "location": "store/business location",
  "total": "total amount spent (as a number)",
  "date": "transaction date (YYYY-MM-DD format)",
  "items": [
    {
      "name": "item name (translate to English ONLY if it is a real, concrete noun like fruits, vegetables, food items, or branded products; if the name is a generic category or department label, keep it as a generic English description)",
      "unit_price": "item unit price (as a number)",
      "price": "item total price (as a number)",
      "quantity": "quantity (as a number, default 1)",
      "category": "one of: Groceries, Dining, Transport, Clothing, Household, Health, Entertainment, Subscription, Electronics, Other"
    }
  ]
}

Rules:
- Extract all items from the receipt
- Date must be in YYYY-MM-DD format; if no date is visible, use an empty string
- If category is unclear, use "Other"
- Translate item names to English ONLY if they are real, concrete nouns; do NOT invent specific product names for generic department labels
- Return ONLY valid JSON, no markdown, no code blocks, no explanations
- All prices must be numbers (no currency symbols)
- If the image is not a receipt, return {"merchant": "", "total": 0, "date": "", "items": []}`

const insightsPrompt = (transactions, currency) => `You are a personal finance assistant.

Analyze the following previous-month transaction data and generate exactly 3 to 4 specific, numerical and actionable money-saving suggestions.

Each suggestion MUST:
- Be strictly based on the provided data (no assumptions)
- Include real numbers from the data (prices, totals, differences, counts)
- Include a clear action the user can take
- Include a realistic estimated monthly saving

Focus on price comparisons of the same product across stores, repeatedly bought items, category overspending, bottle-deposit (Pfand) recovery where relevant, and drink/snack cutbacks.

DO NOT give generic advice, repeat the same type of suggestion, mention budgeting theory, or mention percentages without real amounts.
All amounts are in ${currency}.

Return JSON only:
{
  "suggestions": [
    {
      "title": "Short title (max 6 words)",
      "insight": "What happened, based on the data — short and to the point",
      "action": "What the user should do",
      "estimated_saving_per_month": 0
    }
  ]
}

Previous-month transaction data:
${JSON.stringify(transactions)}`

// Keep only what the prompt needs (data minimisation)
function minimiseTransactions(list) {
  if (!Array.isArray(list) || list.length === 0 || list.length > MAX_TRANSACTIONS) {
    throw new HttpError(400, "Invalid transaction data")
  }
  return list.map((t) => ({
    date: String(t?.date ?? "").slice(0, 10),
    merchant: String(t?.merchant ?? "").slice(0, 100),
    total: Number(t?.total) || 0,
    items: (Array.isArray(t?.lineItems) ? t.lineItems : []).slice(0, 100).map((i) => ({
      name: String(i?.name ?? "").slice(0, 100),
      price: Number(i?.price) || 0,
      quantity: Number(i?.quantity) || 1,
      category: String(i?.category ?? "").slice(0, 40)
    }))
  }))
}

/**
 * @returns {Promise<{ status: number, body: object }>}
 */
export async function handleGeminiRequest({ method, authorization, appCheckToken, body, env }) {
  try {
    if (method !== "POST") throw new HttpError(405, "Method not allowed")

    const apiKey = env.GEMINI_API_KEY
    const projectId = env.FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID
    if (!apiKey || !projectId) {
      console.error("[gemini] GEMINI_API_KEY or FIREBASE_PROJECT_ID is not configured")
      throw new HttpError(503, "This feature is temporarily unavailable.")
    }

    const uid = await verifyUser(authorization, projectId)
    // The project number is the Firebase messagingSenderId.
    const projectNumber = env.FIREBASE_PROJECT_NUMBER || env.VITE_FIREBASE_MESSAGING_SENDER_ID
    await verifyAppCheck(appCheckToken, projectNumber, env.APP_CHECK_ENFORCE === "true")
    const action = body?.action
    if (!LIMITS[action]) throw new HttpError(400, "Unknown action")
    rateLimit(uid, action)

    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: MODEL })
    let result

    if (action === "analyzeReceipt") {
      const { data, mimeType } = body.image || {}
      if (typeof data !== "string" || !ALLOWED_MIME.has(mimeType)) throw new HttpError(400, "Unsupported image type")
      if (data.length > MAX_IMAGE_BASE64) throw new HttpError(413, "Image is too large")
      result = await generateWithRetry(model, [RECEIPT_PROMPT, { inlineData: { data, mimeType } }])
    } else {
      const currency = /^[A-Z]{3}$/.test(body.currency) ? body.currency : "EUR"
      result = await generateWithRetry(model, insightsPrompt(minimiseTransactions(body.transactions), currency))
    }

    const text = result?.response?.text?.()
    if (!text) throw new HttpError(502, "The AI service returned no result. Please try again.")
    try {
      return { status: 200, body: parseJson(text) }
    } catch {
      throw new HttpError(502, "The AI service returned an unreadable result. Please try again.")
    }
  } catch (error) {
    if (error instanceof HttpError) return { status: error.status, body: { error: error.message } }
    console.error("[gemini] upstream error:", error?.message)
    if (error?.status === 429) {
      return { status: 429, body: { error: "The AI service is busy. Please wait a minute and try again." } }
    }
    return { status: 502, body: { error: "The AI service is unavailable right now. Please try again later." } }
  }
}
