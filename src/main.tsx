import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { BackgroundThemeProvider } from '@/contexts/BackgroundThemeContext'
import { BreadcrumbProvider } from '@/contexts/BreadcrumbContext'

createRoot(document.getElementById("root")!).render(
  <BackgroundThemeProvider>
    <BreadcrumbProvider>
      <App />
    </BreadcrumbProvider>
  </BackgroundThemeProvider>
);
