import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'
import { ADMIN_AI_BUILD_ID } from '@/lib/adminAiBuild'

const BUILD_STORAGE_KEY = 'orsh-build-marker'
const BUILD_REFRESH_KEY = `orsh-build-refresh-${ADMIN_AI_BUILD_ID}`

const clearLegacyWebCaches = async () => {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()

    await Promise.all(registrations.map((registration) => registration.unregister()))

    for (const registration of registrations) {
      console.log('[SW Cleanup] Unregistered service worker:', registration.scope)
    }
  }

  if ('caches' in window) {
    const names = await caches.keys()

    await Promise.all(names.map((name) => caches.delete(name)))

    for (const name of names) {
      console.log('[Cache Cleanup] Deleted cache:', name)
    }
  }
}

const bootstrap = async () => {
  try {
    await clearLegacyWebCaches()

    const previousBuild = localStorage.getItem(BUILD_STORAGE_KEY)
    const hasRefreshedThisBuild = sessionStorage.getItem(BUILD_REFRESH_KEY) === '1'

    console.log('[Build Marker] Active build:', ADMIN_AI_BUILD_ID)

    if (previousBuild !== ADMIN_AI_BUILD_ID) {
      localStorage.setItem(BUILD_STORAGE_KEY, ADMIN_AI_BUILD_ID)

      if (!hasRefreshedThisBuild) {
        sessionStorage.setItem(BUILD_REFRESH_KEY, '1')
        window.location.replace(window.location.pathname + window.location.search + window.location.hash)
        return
      }
    }
  } catch (error) {
    console.warn('[Build Marker] Startup cleanup failed', error)
  }

  createRoot(document.getElementById("root")!).render(
    <BackgroundThemeProvider>
      <App />
    </BackgroundThemeProvider>
  )
}

void bootstrap()

