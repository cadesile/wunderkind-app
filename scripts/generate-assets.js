#!/usr/bin/env node
/**
 * Asset variant generator for Wunderkind Factory
 *
 * Input:  assets/logo_master.png  (place your high-res source here, min 1024×1024)
 * Output: all required app icon and splash variants in assets/
 *
 * Key design decisions:
 *  - kernel: 'nearest' throughout — preserves pixel-art sharpness (no Lanczos blur)
 *  - Android foreground: content kept within the inner 66% safe zone (outer 34% masked by launchers)
 *  - Splash: solid WK.greenDark background (#1a5c2a), no alpha channel (iOS shows black on transparent)
 *  - All metadata stripped (withMetadata: false)
 *
 * Usage:
 *   node scripts/generate-assets.js
 *   node scripts/generate-assets.js --input assets/my_logo.png
 */

const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

// ── Config ────────────────────────────────────────────────────────────────────

const ROOT       = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT, 'assets');

const INPUT_FLAG = process.argv.indexOf('--input');
const INPUT_FILE = INPUT_FLAG !== -1
  ? path.resolve(process.argv[INPUT_FLAG + 1])
  : path.join(ASSETS_DIR, 'logo_master.png');

// WK.greenDark — matches app background so splash → app transition is seamless
const SPLASH_BG = '#1a5c2a';

// ── Variant definitions ───────────────────────────────────────────────────────

const VARIANTS = [
  {
    name: 'icon.png',
    // iOS icon: 1024×1024, no alpha (App Store rejects transparent icons)
    width: 1024,
    height: 1024,
    alpha: false,
    background: SPLASH_BG,
    padding: 0,
    description: 'iOS / general app icon',
  },
  {
    name: 'favicon.png',
    // Web favicon: 32×32
    width: 32,
    height: 32,
    alpha: true,
    background: null,
    padding: 0,
    description: 'Web favicon',
  },
  {
    name: 'android-icon-foreground.png',
    // Android adaptive foreground: 1024×1024 canvas, logo confined to inner 66%
    // Outer 34% is the "bleed zone" masked by launcher shapes (circle, squircle, etc.)
    // Safe zone = 1024 * 0.66 = ~676px centred → padding of ~174px each side
    width: 1024,
    height: 1024,
    alpha: true,
    background: null,
    safezone: true, // see processing below
    description: 'Android adaptive icon foreground (66% safe zone)',
  },
  {
    name: 'android-icon-monochrome.png',
    // Android 13+ monochrome icon: same safe-zone rules as foreground, greyscale
    width: 1024,
    height: 1024,
    alpha: true,
    background: null,
    safezone: true,
    greyscale: true,
    description: 'Android monochrome icon (API 33+)',
  },
  {
    name: 'splash-icon.png',
    // Expo splash: 1284×2778 (iPhone 14 Pro Max) with solid background
    // No alpha — iOS will render black background on transparent splash PNGs
    width: 1284,
    height: 2778,
    alpha: false,
    background: SPLASH_BG,
    logoSize: 400, // logo drawn at 400px centred on the canvas
    description: 'Splash screen (iPhone 14 Pro Max resolution)',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function safezoneSize(canvasSize) {
  return Math.round(canvasSize * 0.66);
}

function safezoneOffset(canvasSize, innerSize) {
  return Math.round((canvasSize - innerSize) / 2);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function generate() {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`\n  ERROR: Source file not found: ${INPUT_FILE}`);
    console.error('  Place your high-resolution logo at assets/logo_master.png');
    console.error('  or pass --input <path>\n');
    process.exit(1);
  }

  console.log(`\n  Source: ${path.relative(ROOT, INPUT_FILE)}`);
  console.log(`  Output: ${path.relative(ROOT, ASSETS_DIR)}/\n`);

  for (const variant of VARIANTS) {
    const outPath = path.join(ASSETS_DIR, variant.name);

    try {
      if (variant.safezone) {
        // Adaptive icon safe-zone: resize logo to 66% of canvas, embed on transparent base
        const innerSize = safezoneSize(variant.width);
        const offset    = safezoneOffset(variant.width, innerSize);

        const resizedLogo = await sharp(INPUT_FILE)
          .resize(innerSize, innerSize, {
            kernel: 'nearest',        // pixel-art — no anti-alias blur
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer();

        await sharp({
          create: {
            width: variant.width,
            height: variant.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        })
          .composite([{ input: resizedLogo, top: offset, left: offset }])
          .png({ compressionLevel: 9 })
          .withMetadata(false)
          .toFile(outPath);

      } else if (variant.logoSize) {
        // Splash: logo centred on solid-colour canvas
        const logoSize   = variant.logoSize;
        const offsetX    = Math.round((variant.width  - logoSize) / 2);
        const offsetY    = Math.round((variant.height - logoSize) / 2);

        const resizedLogo = await sharp(INPUT_FILE)
          .resize(logoSize, logoSize, {
            kernel: 'nearest',
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toBuffer();

        await sharp({
          create: {
            width: variant.width,
            height: variant.height,
            channels: 3,              // RGB only — no alpha on splash
            background: SPLASH_BG,
          },
        })
          .composite([{ input: resizedLogo, top: offsetY, left: offsetX }])
          .png({ compressionLevel: 9 })
          .withMetadata(false)
          .toFile(outPath);

      } else {
        // Standard resize
        let pipeline = sharp(INPUT_FILE)
          .resize(variant.width, variant.height, {
            kernel: 'nearest',
            fit: 'contain',
            background: variant.background
              ? variant.background
              : { r: 0, g: 0, b: 0, alpha: 0 },
          });

        if (variant.greyscale) pipeline = pipeline.greyscale();
        if (!variant.alpha)    pipeline = pipeline.flatten({ background: variant.background ?? SPLASH_BG });

        await pipeline
          .png({ compressionLevel: 9 })
          .withMetadata(false)
          .toFile(outPath);
      }

      const stat = fs.statSync(outPath);
      const kb   = (stat.size / 1024).toFixed(1);
      console.log(`  ✓  ${variant.name.padEnd(35)} ${variant.width}×${variant.height}  ${kb} KB  — ${variant.description}`);

    } catch (err) {
      console.error(`  ✗  ${variant.name}: ${err.message}`);
    }
  }

  console.log('\n  Done. Verify assets/ and run `npx expo start` to preview.\n');
}

generate();
