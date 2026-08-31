# Mennyivel menjek? — Optimális autópálya sebesség kalkulátor

Hungarian single-page calculator that computes the optimal highway speed by minimizing total cost per km (fuel + time).

**Live:** https://4szt4l.github.io/mennyivelmenjek/

## Quick Start

```bash
npm test        # Run unit tests (node:test)
npm run e2e     # Run E2E tests (Playwright)
```

## Development

No build step. Pure static files: `index.html`, `style.css`, `script.js`.

```bash
python3 -m http.server 8080   # Serve locally at http://localhost:8080
```

## Deployment

Deployed via GitHub Pages — pushes to `master` auto-deploy.

To redeploy from scratch:

1. Settings → Pages → Source: "Deploy from a branch" → Branch: `master`, folder: `/ (root)`
2. Site available at `https://<user>.github.io/<repo>/` (relative paths ensure subpath compatibility)

## Data Sources

- Fuel prices: [openvan.camp](https://openvan.camp) public API (`https://openvan.camp/api/fuel/prices`), CORS-enabled, cached in localStorage for 6 hours; falls back to default price on failure
- Charts: Chart.js + chartjs-plugin-annotation (CDN)
- Font: Google Fonts (Inter)

## Requirements

- Static hosting only (no server-side code)
- External CDN dependencies: Chart.js, chartjs-plugin-annotation, Google Fonts (Inter)
