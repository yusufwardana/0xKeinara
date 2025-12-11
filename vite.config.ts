import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Critical: Define process.env as an empty object to prevent "process is not defined" errors
      // in the browser, while still allowing specific env vars to be replaced below.
      'process.env': {},
      // Explicitly replace the API key string during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  };
});