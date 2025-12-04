const sharp = require('sharp');
const path = require('path');

// More aggressive: remove ALL grayish pixels that aren't clearly gold/brown button content
async function removeGrayBackground(inputPath, outputPath) {
    const image = sharp(inputPath);
    const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    
    console.log(`Processing ${path.basename(inputPath)}: ${width}x${height}`);
    
    const pixels = new Uint8Array(data);
    let removedCount = 0;
    
    // Button content characteristics:
    // - Gold ornaments: high R, medium-high G, lower B (warm tones)
    // - Leather center: reddish-brown (R > G > B)
    // - Text: dark with some warmth
    // 
    // Background checker:
    // - Neutral gray (R ≈ G ≈ B), either ~60-75 or ~110-130
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            
            const avg = (r + g + b) / 3;
            const spread = Math.max(r, g, b) - Math.min(r, g, b);
            
            // Key insight: checker pattern is NEUTRAL gray (spread very low)
            // Gold has high spread (R >> B), leather has moderate spread (R > B)
            
            // Remove if:
            // 1. Very neutral (spread < 20) AND in gray brightness range (expanded)
            // 2. OR completely dark/black corners
            const isNeutralGray = spread < 20 && avg >= 40 && avg <= 145;
            
            const isBlackCorner = avg < 35 && spread < 15;
            
            if (isNeutralGray || isBlackCorner) {
                pixels[idx + 3] = 0;
                removedCount++;
            }
        }
    }
    
    console.log(`Removed ${removedCount} pixels (${(removedCount / (width * height) * 100).toFixed(1)}%)`);
    
    // Find content bounds
    let minX = width, maxX = 0, minY = height, maxY = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            if (pixels[idx + 3] > 0) {
                minX = Math.min(minX, x);
                maxX = Math.max(maxX, x);
                minY = Math.min(minY, y);
                maxY = Math.max(maxY, y);
            }
        }
    }
    
    // Add small padding
    const pad = 5;
    minX = Math.max(0, minX - pad);
    maxX = Math.min(width - 1, maxX + pad);
    minY = Math.max(0, minY - pad);
    maxY = Math.min(height - 1, maxY + pad);
    
    const cropWidth = maxX - minX + 1;
    const cropHeight = maxY - minY + 1;
    console.log(`Content bounds: ${minX},${minY} to ${maxX},${maxY} (${cropWidth}x${cropHeight})`);
    
    // Create cropped output
    const croppedPixels = new Uint8Array(cropWidth * cropHeight * channels);
    for (let y = 0; y < cropHeight; y++) {
        for (let x = 0; x < cropWidth; x++) {
            const srcIdx = ((y + minY) * width + (x + minX)) * channels;
            const dstIdx = (y * cropWidth + x) * channels;
            croppedPixels[dstIdx] = pixels[srcIdx];
            croppedPixels[dstIdx + 1] = pixels[srcIdx + 1];
            croppedPixels[dstIdx + 2] = pixels[srcIdx + 2];
            croppedPixels[dstIdx + 3] = pixels[srcIdx + 3];
        }
    }
    
    await sharp(Buffer.from(croppedPixels), {
        raw: { width: cropWidth, height: cropHeight, channels: 4 }
    }).png().toFile(outputPath);
    
    console.log(`Saved: ${path.basename(outputPath)} (${cropWidth}x${cropHeight})`);
}

async function main() {
    const uiDir = path.join(__dirname, '..', 'public', 'ui');
    
    await removeGrayBackground(
        path.join(uiDir, 'backup', 'button-primary.png'),
        path.join(uiDir, 'button-primary-clean.png')
    );
    
    await removeGrayBackground(
        path.join(uiDir, 'backup', 'button-secondary.png'),
        path.join(uiDir, 'button-secondary-clean.png')
    );
}

main().catch(console.error);
