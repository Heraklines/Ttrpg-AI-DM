const sharp = require('sharp');
const path = require('path');

async function createProperButton() {
  const srcPath = 'public/ui/backup/button-primary.png';
  const dstPath = 'public/ui/button-primary.png';
  
  // Load the image
  const { data, info } = await sharp(srcPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height, 'channels:', info.channels);
  
  // The gray background color
  const bgR = 61, bgG = 61, bgB = 61;
  const tolerance = 25;
  
  // Create RGBA buffer
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  
  let transparentCount = 0;
  let opaqueCount = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * 3;
    const dstIdx = i * 4;
    
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    
    // Check if this is the gray background
    const isGray = Math.abs(r - bgR) <= tolerance &&
                   Math.abs(g - bgG) <= tolerance &&
                   Math.abs(b - bgB) <= tolerance;
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isGray ? 0 : 255; // Alpha
    
    if (isGray) transparentCount++;
    else opaqueCount++;
  }
  
  console.log('Transparent pixels:', transparentCount, '(' + (transparentCount / (info.width * info.height) * 100).toFixed(1) + '%)');
  console.log('Opaque pixels:', opaqueCount);
  
  // Find actual content bounds
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (rgbaData[idx + 3] > 0) { // Not transparent
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('\nContent bounds:', minX, minY, 'to', maxX, maxY);
  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  console.log('Content size:', contentWidth, 'x', contentHeight);
  console.log('Aspect ratio:', (contentWidth / contentHeight).toFixed(2));
  
  // Create the PNG with transparency
  await sharp(rgbaData, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
  .png()
  .toFile(dstPath);
  
  console.log('\nSaved to', dstPath);
  
  // Also create a cropped version if there's significant padding
  const padding = 10;
  if (minX > padding || minY > padding) {
    const croppedPath = 'public/ui/button-primary-cropped.png';
    await sharp(rgbaData, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4
      }
    })
    .extract({
      left: Math.max(0, minX - padding),
      top: Math.max(0, minY - padding),
      width: Math.min(info.width, contentWidth + padding * 2),
      height: Math.min(info.height, contentHeight + padding * 2)
    })
    .png()
    .toFile(croppedPath);
    
    console.log('Also created cropped version at', croppedPath);
  }
}

createProperButton().catch(console.error);
