import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serves project sites at /repo-name/
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repoName ? `/${repoName}/` : '/'

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
})
