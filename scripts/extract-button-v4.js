const sharp = require('sharp');

async function extractButtonV4() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height);
  
  // Check corners
  const corners = [
    { x: 0, y: 0 },
    { x: 1023, y: 0 },
    { x: 0, y: 1023 },
    { x: 1023, y: 1023 },
  ];
  console.log('\nCorner colors:');
  for (const c of corners) {
    const idx = (c.y * info.width + c.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const bright = Math.round((r + g + b) / 3);
    console.log(`(${c.x}, ${c.y}): rgb(${r}, ${g}, ${b}) bright=${bright} spread=${spread}`);
  }
  
  // The button is roughly in the middle vertically (y: 315-700)
  // Let's use that knowledge and expand detection to catch ALL grays
  
  function isGrayBackground(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    
    // If the color spread is low (< 20), it's gray regardless of brightness
    // The button content has golden/brown colors with spread > 20
    return spread < 20;
  }
  
  // Create RGBA with transparency for gray areas
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  let transparentCount = 0;
  
  // Find content bounds using spread > 20
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const x = i % info.width;
    const y = Math.floor(i / info.width);
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    const isBackground = isGrayBackground(r, g, b);
    
    if (!isBackground) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isBackground ? 0 : 255;
    
    if (isBackground) transparentCount++;
  }
  
  const totalPixels = info.width * info.height;
  console.log('\nTransparent:', (transparentCount / totalPixels * 100).toFixed(1) + '%');
  console.log('Content bounds:', minX, minY, 'to', maxX, maxY);
  
  // Crop
  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Crop:', cropX, cropY, cropW, 'x', cropH, 'aspect:', (cropW / cropH).toFixed(2));
  
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary.png');
  
  console.log('Saved: button-primary.png');
  
  // Secondary
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
    const isBackground = isGrayBackground(r, g, b);
    
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

extractButtonV4().catch(console.error);
