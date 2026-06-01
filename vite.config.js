import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ⚠️  Change 'home-inventory' to YOUR GitHub repo name
export default defineConfig({
  plugins: [react()],
  base: '/home-inventory/',
});
