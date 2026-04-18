import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy document/PDF libraries
          'vendor-pdf': ['pdfjs-dist', 'jspdf'],
          'vendor-docs': ['mammoth', 'html2canvas'],
          // Charting
          'vendor-charts': ['recharts'],
          // UI primitives (Radix)
          'vendor-radix': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-popover',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-dropdown-menu',
          ],
          // Core infra
          'vendor-core': ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
}));
