import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '192.168.1.226',
    port: 8888,
    proxy: {
      '/ssl': {
        target: 'http://192.168.1.133',
        changeOrigin: true,
        secure: false,
        // rewrite: (path) => path.replace(/^\/ssl/, '') 
      }
    }
  }
})
