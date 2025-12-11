import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cast process to any to avoid type error: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      // Prevents "process is not defined" error in browser
      'process.env': {},
      // Hard-replace the API key string during build
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  };
});