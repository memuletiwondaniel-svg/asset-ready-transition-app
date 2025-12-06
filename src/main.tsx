import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'

createRoot(document.getElementById("root")!).render(
  <BackgroundThemeProvider>
    <App />
  </BackgroundThemeProvider>
);
