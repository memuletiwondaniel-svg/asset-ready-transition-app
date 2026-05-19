import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Unique build identifier — regenerated on every dev start and production build.
// Embedded into index.html (<meta name="app-build">) and exposed to runtime
// code via the __APP_BUILD__ define. The runtime version-checker compares
// the embedded value against a freshly-fetched index.html to detect deploys.
const APP_BUILD = String(Date.now());

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    {
      name: "inject-app-build",
      transformIndexHtml(html) {
        return html.replace(/__APP_BUILD__/g, APP_BUILD);
      },
    },
  ].filter(Boolean),
  define: {
    __APP_BUILD__: JSON.stringify(APP_BUILD),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
