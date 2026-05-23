# Fix GitHub Pages 404

GitHub shows Pages is **not enabled** on this repo yet. Do this once:

## Steps

1. Open: https://github.com/kwonseokhyun1-jpg/note/settings/pages

2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**

3. Set:
   - **Branch:** `main`
   - **Folder:** `/docs`

4. Click **Save**

5. Wait 2–5 minutes, then open: https://kwonseokhyun1-jpg.github.io/note/

You should see a green box: *"Your site is live at …"*

## Alternative (if `/docs` does not work)

Use **Branch:** `gh-pages` and **Folder:** `/ (root)` instead.
