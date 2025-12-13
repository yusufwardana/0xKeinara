import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Env variables are loaded for build process, but we DO NOT expose API_KEY to client
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Prevents "process is not defined" error in browser
      'process.env': {},
      // SECURITY: API_KEY is removed from here. It is now accessed only in /api serverless functions.
    }
  };
});