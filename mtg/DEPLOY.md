# Deploy

## GitHub Pages

Live site: **https://kwonseokhyun1-jpg.github.io/commanderhelp/**

1. [Settings → Pages](https://github.com/kwonseokhyun1-jpg/commanderhelp/settings/pages) → **Source: GitHub Actions**
2. Push to `main` or run **Deploy to GitHub Pages** in Actions

## Vercel

Live site: **https://edhhelp.vercel.app/**

Connect the repo and deploy — static frontend only. Decks save in the browser (localStorage).

## Local development

```bash
npm install
npm run dev
```

## Optional: AI keys

| Key | Used for | Where |
|-----|----------|-------|
| `GROQ_API_KEY` | Assistant tab | `.env.local` (dev) + Vercel env vars (production) |
| `VITE_OPENAI_API_KEY` | Deck review in editor | `.env.local` (local dev only) |

On Vercel: Project → Settings → Environment Variables → add `GROQ_API_KEY`.

GitHub Pages is static only — the Assistant needs Vercel (or local dev) for the Groq proxy.
