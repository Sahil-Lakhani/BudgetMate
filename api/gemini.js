// Vercel serverless function: POST /api/gemini
// Env (Vercel → Project → Settings → Environment Variables):
//   GEMINI_API_KEY        — server-only, never prefixed with VITE_
//   FIREBASE_PROJECT_ID   — or VITE_FIREBASE_PROJECT_ID
import { handleGeminiRequest } from "./_lib/geminiCore.js"

export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  const { status, body } = await handleGeminiRequest({
    method: req.method,
    authorization: req.headers.authorization,
    appCheckToken: req.headers["x-firebase-appcheck"],
    body: req.body,
    env: process.env
  })
  res.setHeader("Cache-Control", "no-store")
  res.status(status).json(body)
}
