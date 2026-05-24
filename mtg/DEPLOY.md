# Deploy

## GitHub Pages

Live site: **https://kwonseokhyun1-jpg.github.io/commanderhelp/**

1. [Settings → Pages](https://github.com/kwonseokhyun1-jpg/commanderhelp/settings/pages) → **Source: GitHub Actions**
2. Push to `main` or run **Deploy to GitHub Pages** in Actions

## Vercel

Live site: **https://edhhelp.vercel.app/**

Connect the repo and deploy. The Groq proxy is a serverless function at `api/groq.ts`.

**Vercel project settings (either works):**

| Setting | Repo root deploy | `mtg` subdirectory deploy |
|---------|------------------|---------------------------|
| Root Directory | *(leave empty)* | `mtg` |
| Config used | `/vercel.json` | `mtg/vercel.json` |
| API function | `/api/groq.ts` | `mtg/api/groq.ts` |

If the Assistant still returns HTML instead of JSON, the project is likely building only static files — confirm **Root Directory** matches one of the rows above and redeploy.

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

**Project root must be `mtg`** (where `vercel.json` and `api/` live). The SPA rewrite in `vercel.json` excludes `/api/*` so the Groq serverless function is reachable.

GitHub Pages is static only — the Assistant needs Vercel (or local dev) for the Groq proxy.
