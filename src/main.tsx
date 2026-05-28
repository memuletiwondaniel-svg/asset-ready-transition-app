import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'
import { startVersionCheck } from '@/lib/version-check'
import { runResetIfNeeded, syncTabSessionEpoch } from '@/lib/app-reset'

// One-shot destructive reset (keyed off APP_RESET_ID). If this device
// hasn't seen the current reset id, wipe browser state and hard-reload
// BEFORE booting React so we never render against stale storage.
if (runResetIfNeeded()) {
  // A hard reload is in flight; stop here.
} else {
  syncTabSessionEpoch()
  // Poll for new deploys and trigger the same reset path on mismatch.
  startVersionCheck()

  createRoot(document.getElementById('root')!).render(
    <BackgroundThemeProvider>
      <App />
    </BackgroundThemeProvider>
  )
}
