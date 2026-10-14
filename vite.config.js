import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { handleGeminiRequest } from './api/_lib/geminiCore.js'

// Serves /api/gemini during `npm run dev` with the same handler Vercel runs in production.
function devApi(env) {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/gemini', (req, res) => {
        let raw = ''
        req.on('data', (chunk) => { raw += chunk })
        req.on('end', async () => {
          let body = null
          try { body = JSON.parse(raw || 'null') } catch { /* handled as bad request */ }
          const result = await handleGeminiRequest({
            method: req.method,
            authorization: req.headers.authorization,
            appCheckToken: req.headers['x-firebase-appcheck'],
            body,
            env
          })
          res.statusCode = result.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(result.body))
        })
      })
    }
  }
}

// robots.txt and sitemap.xml are generated from VITE_SITE_URL so they never point at a wrong domain.
const PUBLIC_PATHS = ['/', '/privacy', '/imprint', '/terms']
function seoFiles(siteUrl) {
  const base = (siteUrl || '').replace(/\/$/, '')
  return {
    name: 'seo-files',
    // Fill __SITE_URL__ in index.html; without a URL, drop the tags that need an absolute one
    transformIndexHtml(html) {
      if (base) return html.replaceAll('__SITE_URL__', base)
      return html
        .split('\n')
        .filter((line) => !line.includes('__SITE_URL__'))
        .join('\n')
    },
    generateBundle() {
      if (!siteUrl) {
        this.warn('VITE_SITE_URL is not set — robots.txt/sitemap.xml will not reference your domain')
      }
      const today = new Date().toISOString().slice(0, 10)
      const robots = [
        'User-agent: *',
        ...PUBLIC_PATHS.map((p) => `Allow: ${p === '/' ? '/$' : p}`),
        'Disallow: /',
        '',
        base ? `Sitemap: ${base}/sitemap.xml` : ''
      ].join('\n')
      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PUBLIC_PATHS.map((p) => `  <url><loc>${base}${p}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })
      if (base) this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemap })
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), devApi(env), seoFiles(env.VITE_SITE_URL)],
    esbuild: mode === 'production' ? { pure: ['console.log', 'console.debug', 'console.info'], drop: ['debugger'] } : {},
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          // three.js and recharts are split automatically via the lazy routes in App.jsx
          manualChunks: {
            firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore']
          }
        }
      }
    }
  }
})
