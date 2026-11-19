# Putting the Saathi demo online (free)

The file to upload is `site/index.html`. It is a single page with no server, no API keys and no cost.

## Option A: GitHub Pages (recommended, the link never expires)

1. Sign in at github.com and create a **new public repository**, for example `saathi-demo`.
2. Click **Add file → Upload files**, drop in `site/index.html`, and click **Commit changes**.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, set **Source** to *Deploy from a branch*, pick the `main` branch and the `/ (root)` folder, and click **Save**.
5. After 1–2 minutes your link appears at the top of that page:
   `https://<your-username>.github.io/saathi-demo/`

To update later, upload the new `index.html` to the same repository. The link stays the same.

## Option B: Netlify Drop (fastest)

1. Go to https://app.netlify.com/drop
2. Drag the whole `site` folder onto the page.
3. You get a link straight away. **Sign in and claim the site**, or Netlify deletes it after a short time.
4. Under **Site configuration → Change site name** you can make it something like `saathi-demo.netlify.app`.

## Before you put the link in the deck

- Open the link in a private (incognito) window to confirm judges can see it without signing in.
- Check it on a phone. On narrow screens the page shows an "Owner's phone / Bank dashboard" switch.
- Ask a native Kannada speaker on the team to read the Kannada lines once.

## Suggested line for the pitch deck

> **Try the live demo:** <your link>
> Tap **Auto-play story** to watch the full journey in about 90 seconds, or answer as the owner yourself.
