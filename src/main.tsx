import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'
import ErrorBoundary from '@/components/ErrorBoundary'

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <BackgroundThemeProvider>
      <App />
    </BackgroundThemeProvider>
  </ErrorBoundary>
);
