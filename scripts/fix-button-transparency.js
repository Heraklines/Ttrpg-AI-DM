/**
 * Script to fix transparency issues in button assets
 * 
 * AI-generated images often have a fake "transparent" background that's actually
 * a solid color (usually gray, white, or checkered pattern baked in).
 * 
 * This script:
 * 1. Analyzes the image to find the background color
 * 2. Removes that color and makes it truly transparent
 * 3. Saves the fixed version
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const UI_DIR = path.join(__dirname, '../public/ui');
const BACKUP_DIR = path.join(UI_DIR, 'backup');

async function analyzeImage(imagePath) {
    console.log(`\n📊 Analyzing: ${path.basename(imagePath)}`);
    
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    
    console.log(`  Dimensions: ${metadata.width}x${metadata.height}`);
    console.log(`  Format: ${metadata.format}`);
    console.log(`  Channels: ${metadata.channels}`);
    console.log(`  Has alpha: ${metadata.hasAlpha}`);
    
    // Get raw pixel data
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Sample corners to detect background color
    const corners = [
        { x: 0, y: 0 },
        { x: info.width - 1, y: 0 },
        { x: 0, y: info.height - 1 },
        { x: info.width - 1, y: info.height - 1 },
        { x: 5, y: 5 },
        { x: info.width - 6, y: 5 },
    ];
    
    console.log('\n  Corner pixel samples (RGBA):');
    const cornerColors = [];
    for (const corner of corners) {
        const idx = (corner.y * info.width + corner.x) * info.channels;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = info.channels === 4 ? data[idx + 3] : 255;
        console.log(`    (${corner.x}, ${corner.y}): rgba(${r}, ${g}, ${b}, ${a})`);
        cornerColors.push({ r, g, b, a });
    }
    
    return { metadata, cornerColors, info };
}

async function fixTransparency(imagePath, outputPath, options = {}) {
    const {
        // Background color to remove (if not auto-detected)
        bgColor = null,
        // Tolerance for color matching (0-255)
        tolerance = 30,
        // Whether to also remove near-edge colors
        edgeFade = true,
    } = options;
    
    console.log(`\n🔧 Processing: ${path.basename(imagePath)}`);
    
    const image = sharp(imagePath);
    const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
    
    // Auto-detect background color from corners if not provided
    let targetR, targetG, targetB;
    if (bgColor) {
        targetR = bgColor.r;
        targetG = bgColor.g;
        targetB = bgColor.b;
    } else {
        // Sample corner pixels
        const idx = 0; // Top-left corner
        targetR = data[idx];
        targetG = data[idx + 1];
        targetB = data[idx + 2];
        console.log(`  Auto-detected background: rgb(${targetR}, ${targetG}, ${targetB})`);
    }
    
    // Create output buffer with alpha channel
    const outputChannels = 4;
    const output = Buffer.alloc(info.width * info.height * outputChannels);
    
    let pixelsRemoved = 0;
    
    for (let y = 0; y < info.height; y++) {
        for (let x = 0; x < info.width; x++) {
            const srcIdx = (y * info.width + x) * info.channels;
            const dstIdx = (y * info.width + x) * outputChannels;
            
            const r = data[srcIdx];
            const g = data[srcIdx + 1];
            const b = data[srcIdx + 2];
            const srcAlpha = info.channels === 4 ? data[srcIdx + 3] : 255;
            
            // Check if this pixel matches the background color
            const diffR = Math.abs(r - targetR);
            const diffG = Math.abs(g - targetG);
            const diffB = Math.abs(b - targetB);
            
            // Calculate how close this pixel is to the background
            const maxDiff = Math.max(diffR, diffG, diffB);
            
            let alpha = srcAlpha;
            
            if (maxDiff <= tolerance) {
                // This pixel is close to background color - make it transparent
                // Fade alpha based on how close it is to the background
                if (edgeFade && maxDiff > tolerance / 2) {
                    // Partial transparency for edge pixels
                    alpha = Math.round((maxDiff / tolerance) * 255);
                } else {
                    alpha = 0;
                }
                pixelsRemoved++;
            }
            
            output[dstIdx] = r;
            output[dstIdx + 1] = g;
            output[dstIdx + 2] = b;
            output[dstIdx + 3] = alpha;
        }
    }
    
    console.log(`  Pixels made transparent: ${pixelsRemoved} (${((pixelsRemoved / (info.width * info.height)) * 100).toFixed(1)}%)`);
    
    // Save the result
    await sharp(output, {
        raw: {
            width: info.width,
            height: info.height,
            channels: outputChannels,
        }
    })
    .png()
    .toFile(outputPath);
    
    console.log(`  ✅ Saved: ${path.basename(outputPath)}`);
}

async function processButtonAssets() {
    console.log('🎨 Button Asset Transparency Fixer\n');
    console.log('=' .repeat(50));
    
    // Create backup directory
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    const buttonFiles = ['button-primary.png', 'button-secondary.png'];
    
    for (const file of buttonFiles) {
        const filePath = path.join(UI_DIR, file);
        
        if (!fs.existsSync(filePath)) {
            console.log(`⚠️  Skipping ${file} - not found`);
            continue;
        }
        
        // Backup original
        const backupPath = path.join(BACKUP_DIR, file);
        if (!fs.existsSync(backupPath)) {
            fs.copyFileSync(filePath, backupPath);
            console.log(`📦 Backed up: ${file}`);
        }
        
        // Analyze the image
        const analysis = await analyzeImage(filePath);
        
        // Try to fix transparency with different tolerances
        const fixedPath = path.join(UI_DIR, file.replace('.png', '-fixed.png'));
        
        // Use the most common corner color as background
        await fixTransparency(filePath, fixedPath, {
            tolerance: 25,
            edgeFade: true,
        });
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✨ Done! Check the -fixed.png files.');
    console.log('If they look good, you can rename them to replace the originals.');
}

// Run the script
processButtonAssets().catch(console.error);
