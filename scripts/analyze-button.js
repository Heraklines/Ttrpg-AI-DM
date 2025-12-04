const sharp = require('sharp');

async function analyzeButton() {
  const { data, info } = await sharp('public/ui/backup/button-primary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('Image:', info.width, 'x', info.height, 'channels:', info.channels);
  
  // Find bounding box of non-gray content
  const gray = { r: 61, g: 61, b: 61 };
  const tolerance = 15;
  
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      const isGray = Math.abs(r - gray.r) <= tolerance &&
                     Math.abs(g - gray.g) <= tolerance &&
                     Math.abs(b - gray.b) <= tolerance;
      
      if (!isGray) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  const aspectRatio = contentWidth / contentHeight;
  
  console.log('\nBounding box of button content:');
  console.log('  X:', minX, 'to', maxX, '(width:', contentWidth, ')');
  console.log('  Y:', minY, 'to', maxY, '(height:', contentHeight, ')');
  console.log('  Aspect ratio:', aspectRatio.toFixed(2));
  
  // Sample some colors from the center to understand the button color
  const centerX = Math.floor((minX + maxX) / 2);
  const centerY = Math.floor((minY + maxY) / 2);
  const centerIdx = (centerY * info.width + centerX) * info.channels;
  console.log('\nCenter color (at', centerX, ',', centerY, '):');
  console.log('  RGB:', data[centerIdx], data[centerIdx+1], data[centerIdx+2]);
}

analyzeButton().catch(console.error);
