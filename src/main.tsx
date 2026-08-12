import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'
import { captureTelegramInitData } from '@/features/auth/telegram'

import '@/i18n'
import './index.css'

// Persist Mini App launch payload before the SPA touches the URL.
captureTelegramInitData()

const container = document.getElementById('root')

if (!container) {
  throw new Error('Root container #root is missing from index.html')
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
