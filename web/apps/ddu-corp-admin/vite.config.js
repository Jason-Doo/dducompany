import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages deploy path:
// https://<owner>.github.io/<repo>/admin/
// (repo = dducompany)
export default defineConfig(() => {
  const isGhPages = process.env.GITHUB_PAGES === 'true'
  return {
    plugins: [react()],
    base: isGhPages ? '/dducompany/admin/' : '/',
  }
})
