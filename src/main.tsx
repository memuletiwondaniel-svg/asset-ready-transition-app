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
  const root = document.getElementById("root")!;

  // Inject loading screen immediately — covers the async cache-clearing gap
  // so no stale cached bundle can flash through before React mounts
  root.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0a0a0a">
      <div style="width:40px;height:40px;border:3px solid rgba(255,255,255,0.1);border-top-color:rgba(255,255,255,0.7);border-radius:50%;animation:spin .8s linear infinite"></div>
    </div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  `;

  try {
    await clearLegacyWebCaches();
  } catch (error) {
    console.warn('[Boot] Startup cleanup failed', error);
  }

  createRoot(root).render(
    <BackgroundThemeProvider>
      <App />
    </BackgroundThemeProvider>
  )
}

void bootstrap()
