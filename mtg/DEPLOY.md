# Deploy (GitHub Pages)

Live site: **https://kwonseokhyun1-jpg.github.io/edhassist/**

## Pages setup

1. [Settings → Pages](https://github.com/kwonseokhyun1-jpg/edhassist/settings/pages)
2. **Source** must be **GitHub Actions**

## Deploy

Push to `main` or run **Deploy to GitHub Pages** from the Actions tab.

## Local development (full app + database)

```bash
npm install
npm run db:push    # create SQLite database
npm run dev        # API server (Prisma) + Vite frontend
```

Sign up / deck cloud save use the local API (`server/` + Prisma SQLite). Copy `.env.example` to `.env` if needed.

## Optional: Judge AI (local dev only)

Add `VITE_OPENAI_API_KEY` to `.env.local` and run `npm run dev`. The Assistant uses the Vite dev proxy.

## Production note

GitHub Pages serves the static frontend only. Deck sign-up requires the API server (`npm run dev` locally, or deploy `server/` to a Node host and point the frontend at it).
