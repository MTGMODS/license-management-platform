import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'

/**
 * Each backend service owns a distinct path prefix, so the dev server can route
 * by prefix alone and the app can talk to a single origin. This sidesteps the
 * backend CORS allowlist, which has no port variants and would reject :5173.
 */
const SERVICE_PREFIXES: Record<string, string> = {
  '/api/v1/users': 'VITE_DEV_USER_TARGET',
  '/api/v1/license': 'VITE_DEV_LICENSE_TARGET',
  '/api/v1/usage': 'VITE_DEV_USAGE_TARGET',
  '/api/v1/files': 'VITE_DEV_DISTRIBUTION_TARGET',
}

const FALLBACK_TARGETS: Record<string, string> = {
  VITE_DEV_USER_TARGET: 'http://127.0.0.1:8001',
  VITE_DEV_LICENSE_TARGET: 'http://127.0.0.1:8002',
  VITE_DEV_USAGE_TARGET: 'http://127.0.0.1:8003',
  VITE_DEV_DISTRIBUTION_TARGET: 'http://127.0.0.1:8005',
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  const proxy = Object.entries(SERVICE_PREFIXES).reduce<Record<string, ProxyOptions>>(
    (acc, [prefix, envKey]) => {
      acc[prefix] = {
        target: env[envKey] || FALLBACK_TARGETS[envKey],
        changeOrigin: true,
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
