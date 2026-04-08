#!/bin/bash
# generate-logo-pngs.sh
# Generates PNG exports of Hearsay logos in multiple sizes

set -e

SIZES=(512 256 128 64 32)
LOGOS_DIR="$(dirname "$0")/logos"
EXPORT_DIR="$LOGOS_DIR/png-exports"

echo "🎨 Generating Hearsay logo PNG exports..."
echo ""

# Check for rsvg-convert
if ! command -v rsvg-convert &> /dev/null; then
    echo "❌ rsvg-convert not found. Install with:"
    echo "   Ubuntu/Debian: sudo apt install librsvg2-bin"
    echo "   macOS: brew install librsvg"
    echo "   Fedora: sudo dnf install librsvg2-tools"
    echo ""
    echo "Alternatively, use Inkscape or ImageMagick (see README.md)"
    exit 1
fi

# Create directories
for size in "${SIZES[@]}"; do
    mkdir -p "$EXPORT_DIR/${size}x${size}"
done

echo "📦 Exporting icon variations..."

# Icon (square, all sizes, transparent and with background)
for size in "${SIZES[@]}"; do
    echo "  → ${size}x${size} (transparent)"
    rsvg-convert -w "$size" -h "$size" \
        "$LOGOS_DIR/hearsay-icon-only.svg" \
        > "$EXPORT_DIR/${size}x${size}/hearsay-icon-${size}x${size}.png"

    echo "  → ${size}x${size} (cream background)"
    rsvg-convert -w "$size" -h "$size" \
        --background-color="#FAF7F0" \
        "$LOGOS_DIR/hearsay-icon-only.svg" \
        > "$EXPORT_DIR/${size}x${size}/hearsay-icon-${size}x${size}-bg.png"
done

echo ""
echo "📦 Exporting wordmark variations..."

# Wordmarks (maintain aspect ratio, transparent background)
for logo in hearsay-full-wordmark hearsay-wordmark-only hearsay-monochrome; do
    echo "  → $logo"
    for size in "${SIZES[@]}"; do
        rsvg-convert -w "$size" \
            "$LOGOS_DIR/${logo}.svg" \
            > "$EXPORT_DIR/${size}x${size}/${logo}-${size}w.png"
    done
done

echo ""
echo "✅ PNG exports generated successfully!"
echo "📁 Output directory: $EXPORT_DIR"
echo ""
echo "Generated files:"
echo "  - Icon (transparent): hearsay-icon-{size}x{size}.png"
echo "  - Icon (with bg): hearsay-icon-{size}x{size}-bg.png"
echo "  - Wordmarks: {variant}-{size}w.png"
echo ""
echo "Sizes: 512x512, 256x256, 128x128, 64x64, 32x32"
echo ""
echo "🎉 Done!"
