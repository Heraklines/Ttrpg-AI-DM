const sharp = require('sharp');

async function extractButtonV3() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height);
  
  // The checkered pattern has TWO gray tones:
  // - Dark gray: brightness ~58-65, spread 0-6
  // - Light gray: brightness ~118-125, spread 0-6
  // The actual button content has higher color spread (>15-20)
  
  function isCheckeredBackground(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    const brightness = (r + g + b) / 3;
    
    // Checkered background: LOW spread (gray = r≈g≈b) in certain brightness ranges
    // Spread < 15 means it's essentially gray
    // We need to exclude BOTH the dark gray (50-70) AND light gray (110-130)
    if (spread < 15) {
      // Dark gray squares
      if (brightness >= 50 && brightness <= 75) return true;
      // Light gray squares  
      if (brightness >= 110 && brightness <= 135) return true;
      // Also catch mid-gray
      if (brightness >= 85 && brightness <= 105) return true;
    }
    
    return false;
  }
  
  // Find the actual button content bounds (non-checkered)
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      if (!isCheckeredBackground(r, g, b)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('Button bounds:', minX, minY, 'to', maxX, maxY);
  
  // Create RGBA with transparency for checkered areas
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  let transparentCount = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    const isBackground = isCheckeredBackground(r, g, b);
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isBackground ? 0 : 255;
    
    if (isBackground) transparentCount++;
  }
  
  const totalPixels = info.width * info.height;
  console.log('Transparent:', (transparentCount / totalPixels * 100).toFixed(1) + '%');
  
  // Crop to content with small padding
  const padding = 0;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Crop:', cropW, 'x', cropH, 'aspect:', (cropW / cropH).toFixed(2));
  
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary.png');
  
  console.log('Saved: button-primary.png');
  
  // Process secondary button the same way
  const { data: data2, info: info2 } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  let minX2 = info2.width, maxX2 = 0, minY2 = info2.height, maxY2 = 0;
  const rgbaData2 = Buffer.alloc(info2.width * info2.height * 4);
  
  for (let i = 0; i < info2.width * info2.height; i++) {
    const x = i % info2.width;
    const y = Math.floor(i / info2.width);
    const srcIdx = i * info2.channels;
    const dstIdx = i * 4;
    const r = data2[srcIdx], g = data2[srcIdx + 1], b = data2[srcIdx + 2];
    
    const isBackground = isCheckeredBackground(r, g, b);
    
    if (!isBackground) {
      minX2 = Math.min(minX2, x);
      maxX2 = Math.max(maxX2, x);
      minY2 = Math.min(minY2, y);
      maxY2 = Math.max(maxY2, y);
    }
    
    rgbaData2[dstIdx] = r;
    rgbaData2[dstIdx + 1] = g;
    rgbaData2[dstIdx + 2] = b;
    rgbaData2[dstIdx + 3] = isBackground ? 0 : 255;
  }
  
  const cropX2 = Math.max(0, minX2 - padding);
  const cropY2 = Math.max(0, minY2 - padding);
  const cropW2 = Math.min(info2.width - cropX2, maxX2 - minX2 + 1 + padding * 2);
  const cropH2 = Math.min(info2.height - cropY2, maxY2 - minY2 + 1 + padding * 2);
  
  await sharp(rgbaData2, {
    raw: { width: info2.width, height: info2.height, channels: 4 }
  })
  .extract({ left: cropX2, top: cropY2, width: cropW2, height: cropH2 })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-secondary.png');
  
  console.log('Saved: button-secondary.png', cropW2, 'x', cropH2);
}

extractButtonV3().catch(console.error);
