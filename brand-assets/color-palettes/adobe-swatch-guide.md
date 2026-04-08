# Adobe Swatch (.ase) Guide

## Creating the Hearsay Color Palette in Adobe Applications

Since `.ase` files are binary formats, use this guide to import the Hearsay color palette into Adobe applications.

### Method 1: Import from CSS/JSON

**Adobe XD / Photoshop / Illustrator (2020+):**
1. Use a plugin like "Color Palette from JSON" or "Swatches Importer"
2. Import from `hearsay-figma-tokens.json`

### Method 2: Manual Creation

**Create New Swatch Library:**

#### Primary Colors
- **Coral** - #F08080 (RGB: 240, 128, 128)
- **Coral Light** - #FFB3B3 (RGB: 255, 179, 179)
- **Coral Dark** - #E06666 (RGB: 224, 102, 102)

#### Secondary Colors
- **Mint** - #98D8C8 (RGB: 152, 216, 200)
- **Mint Light** - #B8E6D8 (RGB: 184, 230, 216)
- **Mint Dark** - #7AC4B0 (RGB: 122, 196, 176)

#### Accent Colors
- **Amber** - #FFB366 (RGB: 255, 179, 102)
- **Amber Light** - #FFCC99 (RGB: 255, 204, 153)
- **Amber Dark** - #FF9933 (RGB: 255, 153, 51)
- **Lavender** - #D4C5F9 (RGB: 212, 197, 249)
- **Lavender Light** - #E6DDFF (RGB: 230, 221, 255)
- **Lavender Dark** - #B8A8E8 (RGB: 184, 168, 232)

#### Neutral Colors
- **Cream** - #FAF7F0 (RGB: 250, 247, 240)
- **Cream Dark** - #F0EBE0 (RGB: 240, 235, 224)
- **Warm Mid** - #E8B4B8 (RGB: 232, 180, 184)
- **Warm Light (Fixed)** - #7A5C5C (RGB: 122, 92, 92) ⚠️ WCAG AA Compliant

#### State Colors
- **Success** - #5DB075 (RGB: 93, 176, 117)
- **Error** - #E74C3C (RGB: 231, 76, 60)
- **Warning** - #F39C12 (RGB: 243, 156, 18)
- **Info** - #3498DB (RGB: 52, 152, 219)

### Gradient Swatches

**Coral to Mint Gradient:**
- Type: Linear, 135°
- Stop 1: #F08080 @ 0%
- Stop 2: #98D8C8 @ 100%

**Amber to Lavender Gradient:**
- Type: Linear, 135°
- Stop 1: #FFB366 @ 0%
- Stop 2: #D4C5F9 @ 100%

### Exporting to .ase

**In Adobe Illustrator:**
1. Create swatches using colors above
2. Select all swatches in Swatches panel
3. Click panel menu → "Save Swatch Library as ASE..."
4. Name: "Hearsay Brand Colors"

**In Adobe Photoshop:**
1. Open Swatches panel
2. Create new swatches with colors above
3. Panel menu → "Save Swatches..."
4. Format: Adobe Swatch Exchange (.ase)

---

## Color Contrast Compliance

⚠️ **Important Update:** Warm Light color changed from `#A89090` to `#7A5C5C` to meet WCAG AA contrast ratio of 4.5:1 when used on cream backgrounds.

**Contrast Ratios (on #FAF7F0 cream background):**
- Old Warm Light (#A89090): 2.8:1 ❌ Failed
- New Warm Light (#7A5C5C): 4.7:1 ✅ Passed

Use the new value in all design files going forward.
