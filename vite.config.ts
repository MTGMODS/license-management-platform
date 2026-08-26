import type { ServerResponse } from 'node:http'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

/**
 * Each backend service owns a distinct path prefix, so the dev server can route
 * by prefix alone and the app can talk to a single origin. This sidesteps the
 * backend CORS allowlist, which echoes only approved origins and has no port
 * variants, so it would reject :5173.
 */
const SERVICE_PREFIXES: Record<string, string> = {
  '/v1/users': 'VITE_DEV_USER_TARGET',
  '/v1/license': 'VITE_DEV_LICENSE_TARGET',
  '/v1/usage': 'VITE_DEV_USAGE_TARGET',
  '/v1/files': 'VITE_DEV_DISTRIBUTION_TARGET',
}

/**
 * With no per-service target configured, development runs against the public
 * gateway, which is the only place the full stack is actually live.
 */
const GATEWAY_FALLBACK = 'https://api.mtgmods.com'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const gateway = env.VITE_DEV_GATEWAY_TARGET || GATEWAY_FALLBACK

  const proxy = Object.entries(SERVICE_PREFIXES).reduce<Record<string, ProxyOptions>>(
    (acc, [prefix, envKey]) => {
      const direct = env[envKey]

      acc[prefix] = {
        target: direct || gateway,
        changeOrigin: true,
        // A service reached directly still mounts its router under /api/v1;
        // only the gateway strips that segment.
        ...(direct ? { rewrite: (path: string) => `/api${path}` } : {}),
        /**
         * When a local target is down (ECONNREFUSED), http-proxy can leave the
         * browser request open. Hung same-origin slots then starve tariffs /
         * license and the VIP page looks dead. Always close with 502.
         */
        configure: (proxyServer) => {
          proxyServer.on('error', (_err, _req, res) => {
            const response = res as ServerResponse | undefined
            if (!response || typeof response.writeHead !== 'function') return
            if (response.headersSent || response.writableEnded) return
            response.writeHead(502, { 'Content-Type': 'application/json' })
            response.end(JSON.stringify({ message: 'Bad gateway' }))
          })
        },
      }
      return acc
    },
    {},
  )

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Bind every interface so the tunnel and other devices on the LAN can
      // reach the dev server; the default localhost-only bind refuses them.
      host: true,
      // Vite rejects unknown Host headers to guard against DNS rebinding.
      // Tunnel subdomains rotate, so whole domains are allowed rather than the
      // single current URL. Dev server only: `vite build` ignores this block.
      allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io'],
      proxy,
    },
  }
})
