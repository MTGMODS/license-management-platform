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
      proxy,
    },
  }
})
