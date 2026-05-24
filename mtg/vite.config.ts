import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { ProxyOptions } from 'vite'

// GitHub Pages serves project sites at /repo-name/
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repoName ? `/${repoName}/` : '/'

function createProxies(openaiKey: string | undefined) {
  const apiProxy: ProxyOptions = {
    target: 'http://localhost:3001',
    changeOrigin: true,
  }

  const tcgplayerProxy: ProxyOptions = {
    target: 'https://infinite-api.tcgplayer.com',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/tcgplayer/, ''),
    headers: {
      Origin: 'https://www.tcgplayer.com',
      Referer: 'https://www.tcgplayer.com/',
    },
  }

  const openaiProxy: ProxyOptions = {
    target: 'https://api.openai.com/v1',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api\/openai/, ''),
    configure: (proxy) => {
      proxy.on('proxyReq', (proxyReq) => {
        if (openaiKey) {
          proxyReq.setHeader('Authorization', `Bearer ${openaiKey}`)
        }
      })
    },
  }

  return {
    '/api/auth': apiProxy,
    '/api/decks': apiProxy,
    '/api/health': apiProxy,
    '/api/tcgplayer': tcgplayerProxy,
    '/api/openai': openaiProxy,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const openaiKey = env.VITE_OPENAI_API_KEY?.trim() || env.OPENAI_API_KEY?.trim()
  const proxy = createProxies(openaiKey)

  return {
    base,
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  }
})
