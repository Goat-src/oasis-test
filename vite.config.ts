import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/oasis-test/',
  server: {
    proxy: {
      '/api/users': {
        target: 'http://192.168.1.100:3003',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/api/files': {
        target: 'http://192.168.1.100:3004',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/files/, ''),
      },
      '/api/accounting': {
        target: 'http://192.168.1.100:3005',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/accounting/, ''),
      },
    },
  },
})
