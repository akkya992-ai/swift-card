import { Jimp } from 'jimp';
import * as path from 'path';
import * as fs from 'fs';

const SOURCE_IMAGE = path.join('src', 'assets', 'images', 'daily_mart_green_logo_1781598237470.jpg');

const SIZES = [
  { dir: 'mipmap-mdpi', iconSize: 48, foregroundSize: 108 },
  { dir: 'mipmap-hdpi', iconSize: 72, foregroundSize: 162 },
  { dir: 'mipmap-xhdpi', iconSize: 96, foregroundSize: 216 },
  { dir: 'mipmap-xxhdpi', iconSize: 144, foregroundSize: 324 },
  { dir: 'mipmap-xxxhdpi', iconSize: 192, foregroundSize: 432 },
];

async function generate() {
  console.log('[ASSET GENERATOR] Starting launcher icon generation...');
  console.log('[ASSET GENERATOR] Source: ', SOURCE_IMAGE);

  if (!fs.existsSync(SOURCE_IMAGE)) {
    console.error(`[ASSET GENERATOR] Error: Source image not found at ${SOURCE_IMAGE}`);
    process.exit(1);
  }

  // Load the source image
  const image = await Jimp.read(SOURCE_IMAGE);

  // We will process each density folder
  for (const size of SIZES) {
    const targetDir = path.join('android', 'app', 'src', 'main', 'res', size.dir);
    if (!fs.existsSync(targetDir)) {
      console.log(`[ASSET GENERATOR] Creating directory: ${targetDir}`);
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // 1. Generate ic_launcher.png (legacy standard launcher icon, occupies full space)
    const legacyIcon = image.clone();
    legacyIcon.resize({ w: size.iconSize, h: size.iconSize });
    const legacyPath = path.join(targetDir, 'ic_launcher.png');
    await legacyIcon.write(legacyPath as any);
    console.log(`[ASSET GENERATOR] Generated legacy icon: ${legacyPath} (${size.iconSize}x${size.iconSize})`);

    // 2. Generate ic_launcher_round.png (round legacy launcher icon)
    const roundIcon = image.clone();
    roundIcon.resize({ w: size.iconSize, h: size.iconSize });
    const roundPath = path.join(targetDir, 'ic_launcher_round.png');
    await roundIcon.write(roundPath as any);
    console.log(`[ASSET GENERATOR] Generated round icon: ${roundPath} (${size.iconSize}x${size.iconSize})`);

    // 3. Generate ic_launcher_foreground.png (modern adaptive icon foreground layer)
    // For adaptive foreground, let's keep the logo contained in the safe center area (60% scale of foreground size) with white/transparent background padding.
    const logoScaleSize = Math.round(size.foregroundSize * 0.6);
    const scaledLogo = image.clone();
    scaledLogo.resize({ w: logoScaleSize, h: logoScaleSize });

    // In modern Jimp, we can create a transparent background image using the Jimp constructor
    // Let's create an empty transparent canvas of size foregroundSize x foregroundSize
    const bgCanvas = new Jimp({
      width: size.foregroundSize,
      height: size.foregroundSize,
      color: 0x00000000 // transparent color
    });

    // Center the scaled logo on the transparent background
    const x = Math.round((size.foregroundSize - logoScaleSize) / 2);
    const y = Math.round((size.foregroundSize - logoScaleSize) / 2);
    bgCanvas.composite(scaledLogo, x, y);

    const fgPath = path.join(targetDir, 'ic_launcher_foreground.png');
    await bgCanvas.write(fgPath as any);
    console.log(`[ASSET GENERATOR] Generated adaptive foreground icon: ${fgPath} (${size.foregroundSize}x${size.foregroundSize})`);
  }

  console.log('[ASSET GENERATOR] Successfully generated all launcher icons in Android resources!');
}

generate().catch(err => {
  console.error('[ASSET GENERATOR] Fatal generation failed:', err);
  process.exit(1);
});
