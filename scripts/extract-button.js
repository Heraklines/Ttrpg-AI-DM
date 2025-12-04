const sharp = require('sharp');

async function extractButton() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height);
  
  // HSL conversion
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
  
  // Find exact content bounds
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const hsl = rgbToHsl(r, g, b);
      
      const isContent = hsl.s > 8 || hsl.l < 15 || hsl.l > 60;
      
      if (isContent) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('Button bounds:', minX, minY, 'to', maxX, maxY);
  
  // Add small padding
  const padding = 5;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Crop region:', cropX, cropY, cropW, 'x', cropH);
  console.log('Aspect ratio:', (cropW / cropH).toFixed(2));
  
  // Create RGBA buffer with transparency for the cropped region
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  
  for (let i = 0; i < info.width * info.height; i++) {
    const x = i % info.width;
    const y = Math.floor(i / info.width);
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    const hsl = rgbToHsl(r, g, b);
    
    // Gray background detection
    const isGray = hsl.s < 8 && hsl.l > 20 && hsl.l < 55;
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isGray ? 0 : 255;
  }
  
  // Save full with transparency
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary-full.png');
  
  console.log('Saved full transparent: button-primary-full.png');
  
  // Extract and save just the button
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary.png');
  
  console.log('Saved cropped button: button-primary.png');
  console.log('Final size:', cropW, 'x', cropH);
  
  // Do the same for secondary button
  const { data: data2, info: info2 } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  let minX2 = info2.width, maxX2 = 0, minY2 = info2.height, maxY2 = 0;
  
  for (let y = 0; y < info2.height; y++) {
    for (let x = 0; x < info2.width; x++) {
      const idx = (y * info2.width + x) * info2.channels;
      const r = data2[idx], g = data2[idx + 1], b = data2[idx + 2];
      const hsl = rgbToHsl(r, g, b);
      const isContent = hsl.s > 8 || hsl.l < 15 || hsl.l > 60;
      if (isContent) {
        minX2 = Math.min(minX2, x);
        maxX2 = Math.max(maxX2, x);
        minY2 = Math.min(minY2, y);
        maxY2 = Math.max(maxY2, y);
      }
    }
  }
  
  const cropX2 = Math.max(0, minX2 - padding);
  const cropY2 = Math.max(0, minY2 - padding);
  const cropW2 = Math.min(info2.width - cropX2, maxX2 - minX2 + 1 + padding * 2);
  const cropH2 = Math.min(info2.height - cropY2, maxY2 - minY2 + 1 + padding * 2);
  
  console.log('\nSecondary button:', cropW2, 'x', cropH2, 'aspect:', (cropW2/cropH2).toFixed(2));
  
  const rgbaData2 = Buffer.alloc(info2.width * info2.height * 4);
  for (let i = 0; i < info2.width * info2.height; i++) {
    const srcIdx = i * info2.channels;
    const dstIdx = i * 4;
    const r = data2[srcIdx], g = data2[srcIdx + 1], b = data2[srcIdx + 2];
    const hsl = rgbToHsl(r, g, b);
    const isGray = hsl.s < 8 && hsl.l > 20 && hsl.l < 55;
    rgbaData2[dstIdx] = r;
    rgbaData2[dstIdx + 1] = g;
    rgbaData2[dstIdx + 2] = b;
    rgbaData2[dstIdx + 3] = isGray ? 0 : 255;
  }
  
  await sharp(rgbaData2, {
    raw: { width: info2.width, height: info2.height, channels: 4 }
  })
  .extract({ left: cropX2, top: cropY2, width: cropW2, height: cropH2 })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-secondary.png');
  
  console.log('Saved secondary: button-secondary.png');
}

extractButton().catch(console.error);
