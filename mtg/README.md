# Commander Helper

A Magic: The Gathering Commander toolkit:

1. **Find Commander** — Theme/keyword matching with optional popularity sorting
2. **Find Cards** — Natural language card search with semantic ability matching
3. **Decklist** — Validation, upgrades, and saved decklists (Google sign-in)
4. **Finance** — Staples by color (non-lands), prices, deck value chart
5. **Judge** — Rules chatbot + quick rulings with Comprehensive Rules sources

## Run locally

```bash
npm install
cp .env.example .env   # add Firebase keys for accounts; optional OpenAI key for Judge AI
npm run build:data     # downloads commander + card DBs into public/data/
npm run dev
```

## Accounts (Google sign-in)

Sign-in opens a real Google account picker — it is not a fake button. Configure **one** of these in `.env`:

### Option A — Google OAuth (simplest)

1. [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add authorized JavaScript origins: `http://localhost:5173` (and your production URL)
4. Set `VITE_GOOGLE_CLIENT_ID` in `.env`

Decklists are saved in the browser for that Google account.

### Option B — Firebase (cloud decklists)

1. Create a [Firebase](https://console.firebase.google.com/) project
2. Enable **Google** under Authentication → Sign-in method
3. Create a **Firestore** database
4. Copy web app config into `.env` (see `.env.example`)
5. Firestore rules (dev):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /users/{userId}/decklists/{deckId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Judge AI (optional)

Set `VITE_OPENAI_API_KEY` for deeper answers on complex scenarios. Without it, the Judge uses curated rules knowledge locally.

## Data

Card data and prices come from the [Scryfall API](https://scryfall.com/docs/api). Popularity ranks are included in Scryfall bulk data.
