/**
 * Two-Pass Alpha Extraction Utility
 * 
 * Generates transparent PNG from two images:
 * 1. Same content on WHITE background
 * 2. Same content on BLACK background
 * 
 * Uses difference matting to calculate per-pixel alpha.
 * 
 * Usage:
 *   npx tsx scripts/extract-alpha.ts "input-white.png" "input-black.png" "output.png"
 */

import sharp from 'sharp';
import path from 'path';

export interface RGB {
    r: number;
    g: number;
    b: number;
}

/**
 * Extract alpha channel using two-pass difference matting.
 * 
 * Theory:
 * - If pixel is 100% opaque: looks same on black and white (distance = 0)
 * - If pixel is 100% transparent: shows background color (distance = max)
 * - Alpha = 1 - (pixel_distance / max_distance)
 */
export async function extractAlphaTwoPass(
    imgOnWhitePath: string,
    imgOnBlackPath: string,
    outputPath: string
): Promise<void> {
    console.log('🎨 Loading images...');

    const img1 = sharp(imgOnWhitePath);
    const img2 = sharp(imgOnBlackPath);

    // Get raw pixel data with alpha channel
    const { data: dataWhite, info: meta } = await img1
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const { data: dataBlack } = await img2
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

    if (dataWhite.length !== dataBlack.length) {
        throw new Error('Dimension mismatch: Images must be identical size');
    }

    console.log(`📐 Processing ${meta.width}x${meta.height} image...`);

    const outputBuffer = Buffer.alloc(dataWhite.length);

    // Distance between White (255,255,255) and Black (0,0,0)
    // sqrt(255^2 + 255^2 + 255^2) ≈ 441.67
    const bgDist = Math.sqrt(3 * 255 * 255);

    let transparentPixels = 0;
    let opaquePixels = 0;
    let semiTransparentPixels = 0;

    for (let i = 0; i < meta.width * meta.height; i++) {
        const offset = i * 4;

        // Get RGB values for same pixel in both images
        const rW = dataWhite[offset];
        const gW = dataWhite[offset + 1];
        const bW = dataWhite[offset + 2];

        const rB = dataBlack[offset];
        const gB = dataBlack[offset + 1];
        const bB = dataBlack[offset + 2];

        // Calculate distance between the two observed pixels
        const pixelDist = Math.sqrt(
            Math.pow(rW - rB, 2) +
            Math.pow(gW - gB, 2) +
            Math.pow(bW - bB, 2)
        );

        // THE FORMULA:
        // If pixel is 100% opaque: looks same on both backgrounds (pixelDist = 0)
        // If pixel is 100% transparent: shows exact background (pixelDist = bgDist)
        let alpha = 1 - (pixelDist / bgDist);

        // Clamp to 0-1 range
        alpha = Math.max(0, Math.min(1, alpha));

        // Track statistics
        if (alpha < 0.01) {
            transparentPixels++;
        } else if (alpha > 0.99) {
            opaquePixels++;
        } else {
            semiTransparentPixels++;
        }

        // Color Recovery:
        // Use image on black to recover color, dividing by alpha
        // to un-premultiply (brighten semi-transparent pixels)
        let rOut = 0, gOut = 0, bOut = 0;

        if (alpha > 0.01) {
            // Recover foreground color from version on black
            // Since BG is black (0,0,0): C / alpha
            rOut = rB / alpha;
            gOut = gB / alpha;
            bOut = bB / alpha;
        }

        outputBuffer[offset] = Math.round(Math.min(255, rOut));
        outputBuffer[offset + 1] = Math.round(Math.min(255, gOut));
        outputBuffer[offset + 2] = Math.round(Math.min(255, bOut));
        outputBuffer[offset + 3] = Math.round(alpha * 255);
    }

    // Write output PNG
    await sharp(outputBuffer, {
        raw: { width: meta.width, height: meta.height, channels: 4 }
    })
        .png()
        .toFile(outputPath);

    const totalPixels = meta.width * meta.height;
    console.log('');
    console.log('✅ Alpha extraction complete!');
    console.log(`   📁 Output: ${outputPath}`);
    console.log(`   📊 Stats:`);
    console.log(`      - Opaque pixels: ${opaquePixels} (${((opaquePixels / totalPixels) * 100).toFixed(1)}%)`);
    console.log(`      - Semi-transparent: ${semiTransparentPixels} (${((semiTransparentPixels / totalPixels) * 100).toFixed(1)}%)`);
    console.log(`      - Fully transparent: ${transparentPixels} (${((transparentPixels / totalPixels) * 100).toFixed(1)}%)`);
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);

    if (args.length < 3) {
        console.log('');
        console.log('🔮 Two-Pass Alpha Extraction Utility');
        console.log('=====================================');
        console.log('');
        console.log('Usage:');
        console.log('  npx tsx scripts/extract-alpha.ts <white-bg.png> <black-bg.png> <output.png>');
        console.log('');
        console.log('Example:');
        console.log('  npx tsx scripts/extract-alpha.ts button-white.png button-black.png button.png');
        console.log('');
        console.log('The utility calculates per-pixel transparency by comparing');
        console.log('how each pixel appears on white vs black backgrounds.');
        console.log('');
        process.exit(1);
    }

    const [whitePath, blackPath, outputPath] = args;

    try {
        await extractAlphaTwoPass(
            path.resolve(whitePath),
            path.resolve(blackPath),
            path.resolve(outputPath)
        );
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}

main();
