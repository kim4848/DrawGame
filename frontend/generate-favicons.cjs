/**
 * Favicon Generator Script
 * Generates PNG favicons from SVG
 *
 * Run: node generate-favicons.js
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Check if sharp is available
let sharp;
try {
  sharp = require('sharp');
} catch (error) {
  console.error('Error: sharp package not found.');
  console.log('\nTo generate PNG favicons, run:');
  console.log('  npm install sharp --save-dev');
  console.log('  node generate-favicons.js');
  console.log('\nAlternatively, use an online converter:');
  console.log('  1. Open public/favicon.svg');
  console.log('  2. Convert at https://cloudconvert.com/svg-to-png');
  console.log('  3. Generate sizes: 16x16, 32x32, 180x180');
  console.log('  4. Save as: favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png');
  process.exit(1);
}

const svgPath = path.join(__dirname, 'public', 'favicon.svg');
const outputDir = path.join(__dirname, 'public');

async function generateFavicons() {
  const svgBuffer = fs.readFileSync(svgPath);

  const sizes = [
    { width: 16, height: 16, name: 'favicon-16x16.png' },
    { width: 32, height: 32, name: 'favicon-32x32.png' },
    { width: 180, height: 180, name: 'apple-touch-icon.png' },
  ];

  for (const size of sizes) {
    const outputPath = path.join(outputDir, size.name);
    await sharp(svgBuffer)
      .resize(size.width, size.height)
      .png()
      .toFile(outputPath);
    console.log(`✓ Generated ${size.name} (${size.width}x${size.height})`);
  }

  console.log('\n✓ All favicon files generated successfully!');
}

generateFavicons().catch(console.error);
