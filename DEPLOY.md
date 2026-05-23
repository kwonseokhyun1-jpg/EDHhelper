# Deploy Commander Helper (GitHub Pages)

Live site: **https://kwonseokhyun1-jpg.github.io/note/**

## One-time setup

1. Open **Settings → Pages** for this repo:  
   https://github.com/kwonseokhyun1-jpg/note/settings/pages

2. Under **Build and deployment → Source**, choose **GitHub Actions**.

3. (Optional) For Google sign-in on the live site, add repository secrets under **Settings → Secrets and variables → Actions**:
   - `VITE_GOOGLE_CLIENT_ID` — add `https://kwonseokhyun1-jpg.github.io` as an authorized JavaScript origin in Google Cloud Console
   - Or the `VITE_FIREBASE_*` variables if using Firebase

4. Push to `main`. The **Deploy Commander Helper to GitHub Pages** workflow builds `mtg/` and publishes automatically.

## Local preview (same base path as production)

```bash
cd mtg
$env:GITHUB_REPOSITORY="kwonseokhyun1-jpg/note"; npm run build; npm run preview
```

## Manual deploy

Actions tab → **Deploy Commander Helper to GitHub Pages** → **Run workflow**
