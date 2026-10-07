import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs'
import path from 'path'

// Load environment variables (.env) into process.env using Vite's built-in loader
try {
  const env = loadEnv('development', process.cwd(), '')
  Object.assign(process.env, env)
} catch {
  // Ignore in environments where file access is restricted
}

function apiDevPlugin(): Plugin {
  return {
    name: 'api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()

        try {
          const urlObj = new URL(req.url, 'http://localhost:5173')
          const pathname = urlObj.pathname

          let targetPath = path.join(process.cwd(), `${pathname}.ts`)
          if (!fs.existsSync(targetPath)) {
            targetPath = path.join(process.cwd(), `${pathname}/index.ts`)
            if (!fs.existsSync(targetPath)) {
              return next()
            }
          }

          let body: unknown = {}
          if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
            const chunks: Uint8Array[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Uint8Array)
            }
            const rawBody = Buffer.concat(chunks).toString('utf-8')
            if (rawBody) {
              try {
                body = JSON.parse(rawBody)
              } catch {
                body = rawBody
              }
            }
          }

          const query: Record<string, string | string[]> = {}
          for (const [key, value] of urlObj.searchParams.entries()) {
            query[key] = value
          }

          const cookieHeader = req.headers.cookie || ''
          const cookies: Record<string, string> = {}
          cookieHeader.split(';').forEach(c => {
            const [k, v] = c.trim().split('=')
            if (k && v) cookies[k] = decodeURIComponent(v)
          })

          const vercelReq = Object.assign(req, { query, cookies, body })
          const vercelRes = Object.assign(res, {
            status(code: number) {
              res.statusCode = code
              return res
            },
            json(data: unknown) {
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify(data))
              return res
            },
            send(data: unknown) {
              if (typeof data === 'object') {
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify(data))
              } else {
                res.end(data)
              }
              return res
            },
          })

          const relativeImport = path.relative(process.cwd(), targetPath).replace(/\\/g, '/')
          const mod = await server.ssrLoadModule(`/${relativeImport}`)
          const handler = mod.default || mod
          await handler(vercelReq, vercelRes)
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Internal Server Error'
          console.error('[API Dev Error]', err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: false, error: errMsg }))
          }
        }
      })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    apiDevPlugin(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'],
      manifest: {
        name: 'PaisaPal — Personal & Student Money Tracker',
        short_name: 'PaisaPal',
        description: 'Track your money in under 5 seconds. Fast, offline-first personal finance tracker.',
        theme_color: '#1F3B6F',
        background_color: '#0A0F1D',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        id: '/',
        categories: ['finance', 'productivity', 'utilities'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          {
            name: 'Add expense',
            short_name: 'Add',
            description: 'Quickly add a new expense',
            url: '/?action=add',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'gstatic-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
})
