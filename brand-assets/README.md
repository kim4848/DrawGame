# Hearsay Brand Assets

**Created:** 2026-04-06  
**Version:** 1.0  
**Designer:** UXDesigner

This directory contains all official brand assets for Hearsay (Rygtet Går), including logos, color palettes, and brand guidelines.

---

## 📁 Directory Structure

```
brand-assets/
├── logos/                          # Logo files in multiple formats
│   ├── hearsay-full-wordmark.svg   # Primary logo (icon + wordmark + subtitle)
│   ├── hearsay-wordmark-only.svg   # Wordmark without icon
│   ├── hearsay-icon-only.svg       # Icon for app/favicon use
│   ├── hearsay-monochrome.svg      # Grayscale version
│   └── png-exports/                # Rasterized versions (generated)
│       ├── 512x512/
│       ├── 256x256/
│       ├── 128x128/
│       ├── 64x64/
│       └── 32x32/
├── color-palettes/                 # Color system exports
│   ├── hearsay-colors.css          # CSS custom properties
│   ├── hearsay-figma-tokens.json   # Design tokens for Figma
│   └── adobe-swatch-guide.md       # Guide for Adobe apps
├── guidelines/                     # Design system documentation
│   └── BRAND_GUIDELINES.md         # Comprehensive brand guide
└── README.md                       # This file
```

---

## 🎨 Quick Start

### Using the Logo

**Web/App:**
```html
<!-- Primary logo (recommended) -->
<img src="brand-assets/logos/hearsay-full-wordmark.svg" alt="Hearsay" />

<!-- Icon only (app icon, favicon) -->
<link rel="icon" href="brand-assets/logos/hearsay-icon-only.svg" />
```

**Design Tools:**
- Open `.svg` files in Figma, Adobe Illustrator, or Inkscape
- Logos use Fredoka font (download from Google Fonts if needed)

### Using Colors

**CSS:**
```css
@import url('brand-assets/color-palettes/hearsay-colors.css');

button {
  background: var(--color-coral);
  border: 3px solid var(--color-coral-dark);
}
```

**Figma:**
1. Import `color-palettes/hearsay-figma-tokens.json`
2. Use Tokens Studio plugin or manually create color styles

**Adobe:**
- Follow guide in `color-palettes/adobe-swatch-guide.md`

---

## 🖼️ Generating PNG Exports

The primary logo files are **SVG** (vector, scalable). To generate PNG exports:

### Method 1: Using rsvg-convert (Recommended)

```bash
# Install (Ubuntu/Debian)
sudo apt install librsvg2-bin

# Generate all sizes for icon
for size in 512 256 128 64 32; do
  rsvg-convert -w $size -h $size \
    logos/hearsay-icon-only.svg \
    > logos/png-exports/${size}x${size}/hearsay-icon-${size}x${size}.png
done

# Generate other variants
for logo in hearsay-full-wordmark hearsay-wordmark-only hearsay-monochrome; do
  rsvg-convert -w 512 logos/${logo}.svg > logos/png-exports/512x512/${logo}-512.png
  rsvg-convert -w 256 logos/${logo}.svg > logos/png-exports/256x256/${logo}-256.png
done
```

### Method 2: Using Inkscape

```bash
# Install Inkscape
sudo apt install inkscape

# Export to PNG
inkscape logos/hearsay-icon-only.svg \
  --export-type=png \
  --export-filename=logos/png-exports/512x512/hearsay-icon-512x512.png \
  --export-width=512 \
  --export-height=512
```

### Method 3: Using ImageMagick

```bash
# Install ImageMagick
sudo apt install imagemagick

# Convert SVG to PNG
convert -background none -size 512x512 \
  logos/hearsay-icon-only.svg \
  logos/png-exports/512x512/hearsay-icon-512x512.png
```

### Method 4: Online Tools

If no CLI tools available, use:
- [Convertio](https://convertio.co/svg-png/) - Drag & drop SVG, export PNG
- [CloudConvert](https://cloudconvert.com/svg-to-png) - Batch conversion
- Figma - Import SVG, export as PNG at desired sizes

### Automated Script

A generation script is included below:

```bash
#!/bin/bash
# generate-logo-pngs.sh

SIZES=(512 256 128 64 32)
LOGOS_DIR="brand-assets/logos"
EXPORT_DIR="$LOGOS_DIR/png-exports"

# Icon (square, all sizes)
for size in "${SIZES[@]}"; do
  mkdir -p "$EXPORT_DIR/${size}x${size}"
  rsvg-convert -w $size -h $size \
    "$LOGOS_DIR/hearsay-icon-only.svg" \
    > "$EXPORT_DIR/${size}x${size}/hearsay-icon-${size}x${size}.png"

  rsvg-convert -w $size -h $size \
    "$LOGOS_DIR/hearsay-icon-only.svg" \
    --background-color="#FAF7F0" \
    > "$EXPORT_DIR/${size}x${size}/hearsay-icon-${size}x${size}-bg.png"
done

# Wordmarks (maintain aspect ratio)
for logo in hearsay-full-wordmark hearsay-wordmark-only hearsay-monochrome; do
  for size in "${SIZES[@]}"; do
    rsvg-convert -w $size \
      "$LOGOS_DIR/${logo}.svg" \
      > "$EXPORT_DIR/${size}x${size}/${logo}-${size}w.png"
  done
done

echo "✅ PNG exports generated in $EXPORT_DIR"
```

Make executable and run:
```bash
chmod +x generate-logo-pngs.sh
./generate-logo-pngs.sh
```

---

## 🎯 Common Use Cases

### App Icon (iOS/Android)
- Use: `hearsay-icon-only.svg`
- Export: 1024x1024 PNG with transparent background
- Tool: Figma → Export 3x (@3x for retina)

### Favicon
```html
<!-- Multi-size favicon -->
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
```

### Social Media
- **Twitter/X Profile:** 400x400 PNG (icon only)
- **Facebook Cover:** 820x312 PNG (full wordmark centered on cream background)
- **LinkedIn:** 300x300 PNG (icon only with coral background)

### Email Signature
- Use: `hearsay-wordmark-only.svg` or 256px PNG
- Max height: 60px to avoid clipping

### Merchandise (T-shirts, Stickers)
- Use: SVG files (vector, infinite scaling)
- For screen printing: Export monochrome version
- For vinyl stickers: Export icon with coral background

---

## ⚠️ Important Notes

### Color Contrast Update
The **Warm Light** color has been updated for WCAG AA compliance:
- ❌ Old: `#A89090` (2.8:1 contrast ratio)
- ✅ New: `#7A5C5C` (4.7:1 contrast ratio)

**Action Required:** Update any existing designs using the old value.

### Logo Usage Rules
- ✅ Use provided SVG/PNG files as-is
- ✅ Scale proportionally (maintain aspect ratio)
- ✅ Use monochrome variant for grayscale contexts
- ❌ Don't modify colors (except monochrome variant)
- ❌ Don't add effects (drop shadows, glows, etc.)
- ❌ Don't rotate, skew, or distort
- ❌ Don't recreate logo from scratch

### Font Requirements
Logos use **Fredoka** (Google Fonts):
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700;800&display=swap" rel="stylesheet">
```

Body text uses **Nunito**:
```html
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 📖 Full Documentation

For comprehensive design guidelines, see:
**[guidelines/BRAND_GUIDELINES.md](guidelines/BRAND_GUIDELINES.md)**

Includes:
- Typography system
- Claymorphism design patterns
- Animation principles
- Voice & tone guidelines
- Danish language standards
- Accessibility standards

---

## 📦 Deliverables Checklist

- [x] Logo variations (4 SVG files)
- [x] Color palette (CSS, Figma tokens, Adobe guide)
- [x] Brand guidelines (comprehensive markdown)
- [ ] PNG exports (requires manual generation - see above)
- [x] Documentation (this README)

---

## 🔄 Version History

**v1.0** (2026-04-06)
- Initial brand asset package
- Logo system with 4 variations
- Color palette with WCAG AA compliance
- Comprehensive brand guidelines
- Export guides for multiple formats

---

## 📬 Contact

**Design Owner:** UXDesigner  
**Project:** Hearsay (Rygtet Går)  
**Issue Tracker:** [LET-13](/LET/issues/LET-13)

For questions or custom asset requests, create an issue in the project tracker.

---

**Happy designing! 🎨**
