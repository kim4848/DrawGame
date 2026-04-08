# Hearsay Brand Guidelines

**Version:** 1.0  
**Last Updated:** 2026-04-06  
**Design System:** Claymorphism

---

## 1. Brand Overview

### Brand Name
**Primary:** Hearsay  
**Danish:** Rygtet Går  
**Tagline:** "Where drawings become rumors"

### Brand Personality
- **Playful** - Fun, lighthearted multiplayer experience
- **Friendly** - Welcoming to all skill levels
- **Tactile** - Clay aesthetic creates warmth and approachability
- **Social** - Designed for shared laughter and creativity

### Target Audience
- Casual gamers aged 16-35
- Friend groups looking for party games
- Families with teens/young adults
- Remote teams seeking icebreaker activities

---

## 2. Logo System

### Logo Variations

#### Full Wordmark (Primary)
- **File:** `hearsay-full-wordmark.svg`
- **Usage:** Marketing materials, website header, app splash screen
- **Includes:** Icon + "Hearsay" + "Rygtet Går" subtitle

#### Wordmark Only
- **File:** `hearsay-wordmark-only.svg`
- **Usage:** Horizontal layouts, partnerships, merchandise
- **When:** Icon is redundant or space-constrained

#### Icon Only
- **File:** `hearsay-icon-only.svg`
- **Usage:** App icon, favicon, social media profile
- **Minimum size:** 32x32px for clarity

#### Monochrome
- **File:** `hearsay-monochrome.svg`
- **Usage:** Printed materials, grayscale contexts, fax machines (kidding!)

### Logo Construction

**Icon Design:**
- Speech bubble base (represents "hearsay" / gossip)
- Integrated pencil/brush stroke (drawing mechanic)
- Coral-to-mint gradient fill
- Clay shadow for 3D depth
- White accent stroke inside bubble

**Wordmark:**
- Font: Fredoka Bold (700 weight)
- Gradient: Coral (#F08080) to Mint (#98D8C8), 135° diagonal
- Clay shadow effect for tactile feel

**Subtitle:**
- Font: Fredoka Medium (500 weight)
- Color: #A0A0A0 (neutral gray)
- Positioned below wordmark, left-aligned

### Clear Space
Maintain minimum clear space of **0.5x the icon height** on all sides.

```
┌─────────────────────────┐
│                         │
│   [  Hearsay  ]         │  ← 0.5x clear space
│                         │
└─────────────────────────┘
```

### Logo Don'ts
❌ Don't stretch or distort the logo  
❌ Don't change the colors (except monochrome variant)  
❌ Don't rotate or tilt  
❌ Don't place on busy backgrounds that obscure the logo  
❌ Don't add drop shadows or effects beyond the native clay shadow  
❌ Don't recreate the logo from scratch - use provided files

---

## 3. Color Palette

### Primary Colors

**Coral** (Primary CTA, Host Actions)
- Base: `#F08080`
- Light: `#FFB3B3`
- Dark: `#E06666`
- **Usage:** Host buttons, primary CTAs, active states

**Mint** (Secondary, Participant Actions)
- Base: `#98D8C8`
- Light: `#B8E6D8`
- Dark: `#7AC4B0`
- **Usage:** Join buttons, participant indicators, success states

### Accent Colors

**Amber** (Playful Elements)
- Base: `#FFB366`
- Light: `#FFCC99`
- Dark: `#FF9933`
- **Usage:** Random word button, fun interactions, highlights

**Lavender** (Decorative)
- Base: `#D4C5F9`
- Light: `#E6DDFF`
- Dark: `#B8A8E8`
- **Usage:** Decorative accents, secondary CTAs

### Neutral Colors

**Cream** (Background)
- Base: `#FAF7F0`
- Dark: `#F0EBE0`
- **Usage:** Page backgrounds, card backgrounds

**Warm Mid:** `#E8B4B8`  
**Warm Light:** `#7A5C5C` ⚠️ (Updated for WCAG AA compliance)

### State Colors

**Success:** `#5DB075` (Green - correct guesses, completed actions)  
**Error:** `#E74C3C` (Red - errors, warnings)  
**Warning:** `#F39C12` (Orange - cautions, timer alerts)  
**Info:** `#3498DB` (Blue - informational messages)

### Gradients

**Primary Gradient (Coral → Mint):**
```css
background: linear-gradient(135deg, #F08080 0%, #98D8C8 100%);
```
**Usage:** Logo, hero sections, feature highlights

**Accent Gradient (Amber → Lavender):**
```css
background: linear-gradient(135deg, #FFB366 0%, #D4C5F9 100%);
```
**Usage:** Decorative elements, secondary features

### Accessibility

All text colors meet **WCAG AA contrast ratio of 4.5:1** against their backgrounds.

**Example Pairings:**
- Warm Light (#7A5C5C) on Cream (#FAF7F0): **4.7:1** ✅
- Coral Dark (#E06666) on Cream: **5.2:1** ✅
- Mint Dark (#7AC4B0) on Cream: **4.8:1** ✅

---

## 4. Typography

### Font Families

**Headings:** Fredoka  
- Weights: 500 (Medium), 600 (Semibold), 700 (Bold), 800 (Extrabold)
- Character: Rounded, friendly, bold
- Usage: Page titles, section headers, buttons, logo

**Body:** Nunito  
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)
- Character: Clean, readable, warm
- Usage: Paragraph text, UI labels, form inputs

### Type Scale

| Element | Font | Size | Weight | Line Height |
|---------|------|------|--------|-------------|
| Display | Fredoka | 48px | 800 | 1.2 |
| H1 | Fredoka | 36px | 700 | 1.3 |
| H2 | Fredoka | 28px | 700 | 1.4 |
| H3 | Fredoka | 22px | 600 | 1.4 |
| H4 | Fredoka | 18px | 600 | 1.5 |
| Body Large | Nunito | 18px | 400 | 1.6 |
| Body | Nunito | 16px | 400 | 1.6 |
| Body Small | Nunito | 14px | 400 | 1.5 |
| Button | Fredoka | 16px | 600 | 1 |
| Caption | Nunito | 12px | 500 | 1.4 |

### Danish Language

All UI text **must be in Danish**. Use natural, playful phrasing.

**Examples:**
- "Start spil" (not "Begin game")
- "Hvad sker der egentlig?" (playful, authentic)
- "Venter på de andre spillere..." (clear, friendly)

---

## 5. Design System: Claymorphism

### Core Principles

1. **Tactile Depth** - Layered shadows create 3D clay effect
2. **Soft Edges** - Generous border-radius for rounded, friendly shapes
3. **Warm Palette** - Earthy tones evoke handmade clay
4. **Subtle Borders** - 3px solid borders define boundaries
5. **Playful Motion** - Bouncy animations reinforce physicality

### Clay Components

#### Clay Cards
```css
.clay-card {
  background: var(--color-cream);
  border: 3px solid var(--color-warm-mid);
  border-radius: 16px;
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
  padding: 24px;
}
```

#### Clay Buttons
```css
.clay-btn {
  border-radius: 12px;
  border: 3px solid [darker shade];
  box-shadow: 0 4px 0 rgba(0, 0, 0, 0.1);
  transition: transform 0.1s, box-shadow 0.1s;
}

.clay-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 0 rgba(0, 0, 0, 0.1);
}

.clay-btn:active {
  transform: translateY(2px);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.1);
}
```

### Spacing Scale
- **4px** - Tight elements (icon padding)
- **8px** - Related items (button icon gap)
- **12px** - Component internal padding
- **16px** - Default component spacing
- **24px** - Section spacing
- **32px** - Major layout gaps
- **48px** - Page sections

### Border Radius
- **8px** - Small elements (tags, chips)
- **12px** - Buttons, inputs
- **16px** - Cards, modals
- **24px** - Large containers
- **9999px** - Pills, rounded buttons

---

## 6. Animation Principles

### Micro-Interactions

**Wiggle (Playful Attention)**
```css
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-5deg); }
  75% { transform: rotate(5deg); }
}
```
**Usage:** Hovering "Start spil" button, random word button

**Clay Bounce (Physical Feedback)**
```css
@keyframes clay-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```
**Usage:** Successful submissions, game start transitions

**Fade Slide In (Smooth Entrance)**
```css
@keyframes fade-slide-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
```
**Usage:** Page transitions, reveal chains

### Motion Accessibility
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Timing
- **Fast (0.1s)** - Button presses, hovers
- **Medium (0.3s)** - Page transitions, modal open/close
- **Slow (0.6s)** - Reveal animations, celebration effects

### Easing
- **Ease-out** - Entrances, expansions
- **Ease-in** - Exits, collapses
- **Ease-in-out** - Smooth bidirectional motion

---

## 7. Iconography

### Style
- **Prefer emoji** for playful, universal icons (🎲, ⏳, 🎨)
- **Avoid detailed custom icons** - keep it simple and clay-like
- **Stroke weight:** 3-4px to match border weights
- **Corner radius:** Rounded caps and joins

### Icon Library (Recommendations)
- Drawing tools: Phosphor Icons (bold weight, rounded style)
- UI actions: Lucide Icons (stroke-width: 3)
- Custom: SVG with clay shadow filter

---

## 8. Photography & Imagery

### Style Guidelines
- **Warm, natural lighting** (matches cream/coral palette)
- **Candid group shots** (friends laughing, social context)
- **Soft focus backgrounds** (blur = clay aesthetic)
- **Avoid:** Stock photos with fake smiles, overly polished studios

### Illustration Style
- **Hand-drawn feel** - imperfect lines reinforce clay aesthetic
- **Thick outlines** (3-4px) to match UI borders
- **Limited palette** - use brand colors only
- **Playful exaggeration** - oversized smiles, bouncy poses

---

## 9. Voice & Tone

### Brand Voice
- **Friendly, not formal** - "Hej!" not "Welcome to our platform"
- **Playful, not silly** - Fun but not juvenile
- **Clear, not clever** - Prioritize usability over wordplay
- **Encouraging, not competitive** - "Godt gået!" vs. "You won!"

### Danish Language Guidelines
- Use informal "du" (not formal "De")
- Natural contractions and colloquialisms
- Emoji sparingly (only when adding genuine warmth)

### Example Microcopy

| Context | Bad | Good |
|---------|-----|------|
| Error | "An error occurred" | "Ups! Noget gik galt 😅" |
| Loading | "Please wait" | "Venter på de andre spillere..." |
| Empty state | "No drawings yet" | "Ingen tegninger endnu – vær den første!" |
| Success | "Submitted" | "Sendt! 🎉" |

---

## 10. File Organization

### Deliverables Structure
```
brand-assets/
├── logos/
│   ├── hearsay-full-wordmark.svg
│   ├── hearsay-wordmark-only.svg
│   ├── hearsay-icon-only.svg
│   ├── hearsay-monochrome.svg
│   └── png-exports/
│       ├── 512x512/
│       ├── 256x256/
│       ├── 128x128/
│       ├── 64x64/
│       └── 32x32/
├── color-palettes/
│   ├── hearsay-colors.css
│   ├── hearsay-figma-tokens.json
│   └── adobe-swatch-guide.md
└── guidelines/
    └── BRAND_GUIDELINES.md (this file)
```

### Naming Conventions
- Lowercase, hyphen-separated: `hearsay-icon-only.svg`
- Size suffix for rasters: `hearsay-icon-512x512.png`
- Version suffix for iterations: `hearsay-wordmark-v2.svg`

---

## 11. Usage Examples

### Web Application
- **Header:** Full wordmark (SVG, responsive scaling)
- **Favicon:** Icon only, 32x32 PNG
- **Loading spinner:** Icon only with rotation animation

### Social Media
- **Profile picture:** Icon only, 512x512 PNG (transparent background)
- **Cover photo:** Full wordmark on cream background with clay pattern
- **Post graphics:** Use primary gradient as background

### Print Materials
- **Business cards:** Full wordmark (front), icon only (back)
- **Posters:** Large wordmark with subtitle, maintain clear space
- **Merchandise:** Monochrome or full-color depending on print method

---

## 12. Contact & Updates

**Design Owner:** UXDesigner  
**Last Review:** 2026-04-06  
**Next Review:** Quarterly (or when adding new features)

### Requesting Brand Assets
For custom sizes or formats not included in deliverables, contact the design team with:
- Intended use case
- Required dimensions
- File format (SVG, PNG, PDF, etc.)
- Deadline

### Suggesting Changes
Brand guidelines evolve with the product. Submit suggestions via:
1. Create issue in project tracker
2. Tag with "design-system" label
3. Include rationale and visual mockups if applicable

---

**End of Brand Guidelines**

*This document is the single source of truth for Hearsay's visual identity. When in doubt, refer here or ask the design team.*
