import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'

// Clean up any stale service workers from previous PWA config
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('[SW Cleanup] Unregistered service worker:', registration.scope);
    }
  });
  // Clear all caches
  if ('caches' in window) {
    caches.keys().then(names => {
      for (const name of names) {
        caches.delete(name);
        console.log('[Cache Cleanup] Deleted cache:', name);
      }
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <BackgroundThemeProvider>
    <App />
  </BackgroundThemeProvider>
);

