# Markdown to PDF

Paste Markdown, see a styled live preview, and export a clean, print-quality PDF. Fully client-side: no backend, no build step, no dependencies to install.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 4321
# then visit http://localhost:4321
```

## How it works

The entire app is a single `index.html`:

- [marked](https://marked.js.org/) (CDN) parses Markdown (GitHub-flavored).
- [highlight.js](https://highlightjs.org/) (CDN) highlights fenced code blocks.
- The **Download PDF** button calls `window.print()`; an `@media print` stylesheet hides the editor and prints only the document, producing a PDF with selectable text and clean page breaks.

## Deploy

It's a static site. On Vercel, import the repo and accept the defaults (framework auto-detects as "Other", no build command), or run `npx vercel --prod` from the project root.
