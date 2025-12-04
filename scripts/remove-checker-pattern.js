const sharp = require('sharp');
const path = require('path');

// Detect checkered pattern by looking at alternating light/dark squares
// The checker pattern has specific pixel-level alternation

async function removeCheckerPattern(inputPath, outputPath) {
    const image = sharp(inputPath);
    const { data, info } = await image.raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;
    
    console.log(`Processing ${path.basename(inputPath)}: ${width}x${height}`);
    
    const pixels = new Uint8Array(data);
    let removedCount = 0;
    
    // The checker pattern alternates between ~60-70 (dark) and ~115-125 (light)
    // Real button content has different characteristics
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * channels;
            const r = pixels[idx];
            const g = pixels[idx + 1];
            const b = pixels[idx + 2];
            
            // Calculate if this pixel matches checker pattern colors
            const avg = (r + g + b) / 3;
            const spread = Math.max(r, g, b) - Math.min(r, g, b);
            
            // Checker colors are grayish (low spread) in specific brightness ranges
            // Dark squares: ~60-75, Light squares: ~110-130
            const isDarkChecker = avg >= 55 && avg <= 80 && spread < 25;
            const isLightChecker = avg >= 105 && avg <= 135 && spread < 25;
            
            if (isDarkChecker || isLightChecker) {
                // Additional check: look at neighbors to confirm checker pattern
                // In a checker, adjacent pixels should be the opposite brightness
                let hasOpposite = false;
                
                for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                        const nidx = (ny * width + nx) * channels;
                        const navg = (pixels[nidx] + pixels[nidx + 1] + pixels[nidx + 2]) / 3;
                        const nspread = Math.max(pixels[nidx], pixels[nidx + 1], pixels[nidx + 2]) - 
                                       Math.min(pixels[nidx], pixels[nidx + 1], pixels[nidx + 2]);
                        
                        // If neighbor is opposite checker color
                        if (nspread < 25) {
                            if (isDarkChecker && navg >= 100 && navg <= 140) hasOpposite = true;
                            if (isLightChecker && navg >= 50 && navg <= 85) hasOpposite = true;
                        }
                    }
                }
                
                if (hasOpposite) {
                    pixels[idx + 3] = 0; // Make transparent
                    removedCount++;
                }
            }
        }
    }
    
    console.log(`Removed ${removedCount} checker pixels (${(removedCount / (width * height) * 100).toFixed(1)}%)`);
    
    // Find content bounds and crop
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
    
    console.log(`Saved: ${path.basename(outputPath)}`);
}

async function main() {
    const uiDir = path.join(__dirname, '..', 'public', 'ui');
    
    // Process from backup images
    await removeCheckerPattern(
        path.join(uiDir, 'backup', 'button-primary.png'),
        path.join(uiDir, 'button-primary-clean.png')
    );
    
    await removeCheckerPattern(
        path.join(uiDir, 'backup', 'button-secondary.png'),
        path.join(uiDir, 'button-secondary-clean.png')
    );
}

main().catch(console.error);
