# Favicon System

## Design

The Hearsay favicon combines two key elements of the game:

- **Speech Bubble** (yellow) — Represents communication and the "telephone" aspect
- **Pencil** (pink) — Represents drawing and creativity
- **Scribble** (purple) — Shows the drawing activity inside the bubble
- **Background** (purple circle) — Playful, vibrant brand color

## Colors

- Background: `#E8DCC4` (Warm cream/beige)
- Speech bubble: `#FFF8DC` (Cornsilk - light cream)
- Pencil: `#CD853F` (Peru - warm brown)
- Scribble: `#D2691E` (Chocolate - medium brown)
- Pencil tip: `#3E2723` (Dark brown)
- Pencil eraser: `#F4A460` (Sandy brown)
- Theme color: `#E8DCC4`

## Files

- `favicon.svg` — Vector source (32×32, scalable)
- `favicon-16x16.png` — Small size for browser tabs
- `favicon-32x32.png` — Standard size
- `apple-touch-icon.png` — 180×180 for iOS home screen
- `site.webmanifest` — PWA manifest with app metadata

## Regenerating PNG Favicons

If you modify `favicon.svg`, regenerate the PNG files:

```bash
cd frontend
node generate-favicons.cjs
```

This requires the `sharp` package (already in devDependencies).

## Browser Support

- Modern browsers: Use SVG favicon
- Older browsers: Fall back to PNG (32×32 or 16×16)
- iOS/Android: Use apple-touch-icon.png
- PWA: Uses manifest icons

All favicon references are in `index.html` lines 5-11.
