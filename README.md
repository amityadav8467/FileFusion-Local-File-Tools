# FileFusion – Local File Tools

Privacy-first, browser-based file utilities (PDF, image, media, and text tools).  
All processing happens locally in the browser.

---

## Features

- PDF tools: merge, split, compress, extract text, PDF ↔ image
- Image tools: compress, resize, JPG/PNG conversion, image converter
- Media converter using FFmpeg.wasm
- Utility tools: batch rename, file size analyzer, text cleaner, QR code, file hash
- PWA support with `manifest.json` and `service-worker.js`

---

## Tech Stack

- HTML, CSS, JavaScript (no backend)
- External CDN libraries used directly in `index.html`:
  - Tailwind CSS
  - Feather Icons
  - QRCode.js
  - PDF-Lib
  - PDF.js
  - FFmpeg.wasm

---

## Repository Structure

- `index.html` – main app entry point
- `css/styles.css` – styles
- `js/app.js` – core tool logic
- `js/file-upload.js` – modern file upload manager
- `js/workers.js` – worker/helper logic
- `service-worker.js` – caching + offline behavior
- `manifest.json` – PWA manifest
- `tools/` – standalone tool pages

---

## Prerequisites

- A modern browser (Chrome, Edge, Firefox, Safari)
- Internet connection for CDN assets (especially first load)
- A local static server (recommended instead of opening `index.html` directly)

> Important: use `http://localhost` (or HTTPS) so service worker and PWA features work correctly.

---

## Run Locally

From repository root:

```bash
cd /home/runner/work/FileFusion-Local-File-Tools/FileFusion-Local-File-Tools
```

### Option 1: Python

```bash
python3 -m http.server 8080
```

Open: `http://localhost:8080`

### Option 2: Node (if available)

```bash
npx serve .
```

Open the URL shown in terminal.

### Option 3: PHP

```bash
php -S localhost:8080
```

Open: `http://localhost:8080`

---

## Local Verification Checklist

After starting server:

1. Home page loads without console errors
2. At least one tool workflow works (e.g., compress image)
3. Drag-and-drop works
4. Generated output downloads correctly
5. Service worker registers (Application tab in browser devtools)

---

## Build / Install / Test

This project is static and currently has:

- No `package.json`
- No install step
- No build step
- No repository test/lint scripts

Deployment is direct static file hosting.

---

## Deployment

You can deploy to any static host:

- GitHub Pages
- Netlify
- Vercel (static)
- Cloudflare Pages
- Nginx/Apache static hosting

### Generic Static Deployment Steps

1. Upload repository contents to host root
2. Ensure `index.html` is served at site root
3. Ensure these paths are publicly reachable:
   - `/index.html`
   - `/css/styles.css`
   - `/js/app.js`
   - `/js/workers.js`
   - `/service-worker.js`
   - `/manifest.json`
4. Enable HTTPS in production (recommended/required for full PWA behavior)
5. Hard-refresh browser after deploy (`Ctrl+Shift+R`)

---

## GitHub Pages Deployment (Recommended for this repo)

### If publishing from repository root

1. Push changes to your branch/default branch
2. In GitHub repo settings: **Pages**
3. Set source to branch + root (`/`)
4. Save and wait for Pages build
5. Open published URL and verify app + tools

### If publishing under a subpath (project pages)

This code currently uses root-based paths in several places (e.g. `/service-worker.js`, `/index.html`, `start_url: "/"`).  
For subpath hosting (example: `/FileFusion-Local-File-Tools/`), update paths before deploy:

- `index.html` and `js/app.js`: service worker register path
- `service-worker.js`: `CACHE_URLS` and offline retry link
- `manifest.json`: `start_url` and icon paths
- `sitemap.xml` and `robots.txt`: production URL consistency

Then redeploy and clear old service worker cache.

---

## Post-Deployment Validation

1. Open deployed homepage and all major tool panels
2. Upload and process sample files in each category
3. Confirm service worker installation and cache creation
4. Confirm `manifest.json` is valid and icon URLs resolve
5. Check browser console for CDN/network errors
6. Verify `sitemap.xml` and `robots.txt` point to correct live domain

---

## Security & Privacy Notes

- Processing is browser-local; files are not uploaded by app logic
- Validate host headers/security policies when deploying publicly
- Keep CDN dependencies versions pinned (already done in `index.html`)

---

## License

Add/update license details in this README when a project license is finalized.
