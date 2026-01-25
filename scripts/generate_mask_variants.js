// Quick script to generate mask/flatten variants from rembg_test.png
// Usage: node scripts/generate_mask_variants.js

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

(async () => {
  const src = path.resolve(process.cwd(), 'rembg_test.png');
  if (!fs.existsSync(src)) {
    console.error('rembg_test.png not found in project root. Run rembg CLI first.');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), 'tmp', 'variants');
  await fs.promises.mkdir(outDir, { recursive: true });

  const innerThresholds = [200, 210, 220, 230];
  const featherPx = [2, 4, 8, 12];

  console.log('Generating variants into', outDir);

  for (const t of innerThresholds) {
    for (const f of featherPx) {
      const name = `variant_t${t}_f${f}.jpg`;
      const outPath = path.join(outDir, name);
      try {
        // Extract alpha, threshold -> blur -> join with RGB -> flatten -> resize
        const img = sharp(src).ensureAlpha();

        const alphaPng = await img.extractChannel(3).png().toBuffer();

        const mask = await sharp(alphaPng)
          .threshold(t)
          .png()
          .toBuffer();

        const maskFeather = await sharp(mask).blur(f).png().toBuffer();

        const rgbPng = await img.removeAlpha().png().toBuffer();

        const recomposed = await sharp(rgbPng)
          .joinChannel(maskFeather)
          .png()
          .toBuffer();

        await sharp(recomposed)
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .resize(600, 600, { fit: 'cover' })
          .jpeg({ quality: 92 })
          .toFile(outPath);

        console.log('Wrote', name);
      } catch (e) {
        console.error('Failed variant', name, e.message || e);
      }
    }
  }

  console.log('Done. Open files in', outDir);
})();
