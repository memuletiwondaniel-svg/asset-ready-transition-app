import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'

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
  } catch (error) {
    console.warn('[Boot] Startup cleanup failed', error)
  }

  createRoot(document.getElementById("root")!).render(
    <BackgroundThemeProvider>
      <App />
    </BackgroundThemeProvider>
  )
}

void bootstrap()
