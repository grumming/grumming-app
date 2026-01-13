import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Ensure VITE_* env vars are always available at build-time.
  // This prevents runtime crashes like "supabaseUrl is required" when env loading stalls.
  const env = loadEnv(mode, process.cwd(), "VITE_");

  const VITE_SUPABASE_URL =
    env.VITE_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    "https://bxrvutconietinhrngvg.supabase.co";

  const VITE_SUPABASE_PUBLISHABLE_KEY =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ4cnZ1dGNvbmlldGluaHJuZ3ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0Njk5MDQsImV4cCI6MjA4MjA0NTkwNH0.Lywez5XnI1fFpV-eszQGXmd0GXlax_kwaVOcJHhT5DA";

  const VITE_SUPABASE_PROJECT_ID =
    env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || "bxrvutconietinhrngvg";

  return {
    server: {
      host: "::",
      port: 8080,
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      sourcemap: true,
      cssMinify: 'lightningcss',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react-router') || id.includes('scheduler')) {
                return 'vendor-react';
              }
              if (id.includes('@supabase') || id.includes('supabase')) {
                return 'vendor-supabase';
              }
              if (id.includes('@radix-ui') || id.includes('cmdk')) {
                return 'vendor-ui';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('@tanstack')) {
                return 'vendor-query';
              }
            }
          },
        },
      },
    },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(VITE_SUPABASE_URL),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(VITE_SUPABASE_PUBLISHABLE_KEY),
      "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(VITE_SUPABASE_PROJECT_ID),
    },
  };
});
