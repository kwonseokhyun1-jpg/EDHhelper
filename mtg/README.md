# Commander Helper

A Magic: The Gathering Commander toolkit:

1. **Find Commander** — Theme/keyword matching with optional popularity sorting
2. **Find Cards** — Natural language card search with semantic ability matching
3. **Decklist** — Validation, upgrades, and playtest
4. **Finance** — Staples by color (non-lands), prices, deck value chart
5. **Assistant** — Groq-powered chat for rules and deck advice (not official rulings)

## Run locally

```bash
npm install
npm run build:data     # downloads commander + card DBs into public/data/
npm run dev
```

Deck reviews in the editor optionally use OpenAI (`VITE_OPENAI_API_KEY` in `.env.local`). The Assistant tab uses Groq (`GROQ_API_KEY` in `.env.local` locally, or in Vercel env vars for production).

## Data

Card data and prices come from the [Scryfall API](https://scryfall.com/docs/api). Popularity ranks are included in Scryfall bulk data.
