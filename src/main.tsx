import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'
import { startVersionCheck } from '@/lib/version-check'

// Note: Service-worker / Cache Storage cleanup is handled by the inline
// script in index.html <head> BEFORE this module loads. Doing it here is
// too late — the stale bundle has already been parsed and executed.

// Poll for new deploys and auto-reload when a fresh build is detected.
startVersionCheck()

createRoot(document.getElementById('root')!).render(
  <BackgroundThemeProvider>
    <App />
  </BackgroundThemeProvider>
)
