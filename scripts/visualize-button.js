const sharp = require('sharp');
const fs = require('fs');

async function visualizeButton() {
  const { data, info } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('Scanning for button shape...\n');
  
  // Create ASCII visualization of the image (sampled)
  const sampleSize = 64; // 64x64 grid
  const stepX = Math.floor(info.width / sampleSize);
  const stepY = Math.floor(info.height / sampleSize);
  
  // Define background gray
  const bgR = 61, bgG = 61, bgB = 61;
  const tolerance = 25;
  
  let ascii = '';
  for (let y = 0; y < sampleSize; y++) {
    let row = '';
    for (let x = 0; x < sampleSize; x++) {
      const px = x * stepX;
      const py = y * stepY;
      const idx = (py * info.width + px) * info.channels;
      
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      const isGray = Math.abs(r - bgR) <= tolerance &&
                     Math.abs(g - bgG) <= tolerance &&
                     Math.abs(b - bgB) <= tolerance;
      
      // Check saturation for better detection
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const saturation = max === 0 ? 0 : (max - min) / max;
      
      if (saturation < 0.08 && r > 40 && r < 140) {
        row += ' '; // Background (gray)
      } else if (r > 150) {
        row += '#'; // Bright (gold/highlight)
      } else if (r > 80) {
        row += '+'; // Medium (button body)
      } else {
        row += '.'; // Dark (shadow/border)
      }
    }
    ascii += row + '\n';
  }
  
  console.log(ascii);
  
  // Find actual content bounds using HSL saturation
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    }
    return { s: s * 100, l: l * 100 };
  }
  
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const hsl = rgbToHsl(r, g, b);
      
      // Content has saturation > 8% or is very dark/bright
      const isContent = hsl.s > 8 || hsl.l < 15 || hsl.l > 60;
      
      if (isContent) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('\nContent bounds:');
  console.log('  X:', minX, 'to', maxX, '(width:', maxX - minX + 1, ')');
  console.log('  Y:', minY, 'to', maxY, '(height:', maxY - minY + 1, ')');
  console.log('  Aspect ratio:', ((maxX - minX + 1) / (maxY - minY + 1)).toFixed(2));
}

visualizeButton().catch(console.error);
