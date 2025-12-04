const sharp = require('sharp');

async function extractButtonClean() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height);
  
  // HSL conversion
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }
  
  // Find content bounds first
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const hsl = rgbToHsl(r, g, b);
      
      // Content detection: has color saturation OR is very dark/bright
      const isContent = hsl.s > 10 || hsl.l < 12 || hsl.l > 65;
      
      if (isContent) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('Button bounds:', minX, minY, 'to', maxX, maxY);
  
  // Create RGBA with more aggressive gray removal
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  let transparentCount = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const x = i % info.width;
    const y = Math.floor(i / info.width);
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    const hsl = rgbToHsl(r, g, b);
    
    // More aggressive background detection:
    // 1. Low saturation (< 12%) = gray
    // 2. Mid-range lightness (18-58%) = typical gray background range
    // 3. Also catch the lighter grays (the checkered pattern varies)
    const isLowSaturation = hsl.s < 12;
    const isMidLightness = hsl.l > 18 && hsl.l < 58;
    const isGrayBackground = isLowSaturation && isMidLightness;
    
    // Also check RGB directly for gray (r ≈ g ≈ b)
    const maxRGB = Math.max(r, g, b);
    const minRGB = Math.min(r, g, b);
    const rgbSpread = maxRGB - minRGB;
    const isRgbGray = rgbSpread < 20 && r > 40 && r < 150;
    
    const shouldBeTransparent = isGrayBackground || isRgbGray;
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = shouldBeTransparent ? 0 : 255;
    
    if (shouldBeTransparent) transparentCount++;
  }
  
  console.log('Transparent:', (transparentCount / (info.width * info.height) * 100).toFixed(1) + '%');
  
  // Crop to content with padding
  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Crop:', cropW, 'x', cropH, 'aspect:', (cropW / cropH).toFixed(2));
  
  // Save cropped button
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary.png');
  
  console.log('Saved: button-primary.png');
  
  // Process secondary button
  const { data: data2, info: info2 } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  let minX2 = info2.width, maxX2 = 0, minY2 = info2.height, maxY2 = 0;
  const rgbaData2 = Buffer.alloc(info2.width * info2.height * 4);
  
  for (let i = 0; i < info2.width * info2.height; i++) {
    const srcIdx = i * info2.channels;
    const dstIdx = i * 4;
    const r = data2[srcIdx], g = data2[srcIdx + 1], b = data2[srcIdx + 2];
    const hsl = rgbToHsl(r, g, b);
    
    const isContent = hsl.s > 10 || hsl.l < 12 || hsl.l > 65;
    if (isContent) {
      const x = i % info2.width;
      const y = Math.floor(i / info2.width);
      minX2 = Math.min(minX2, x);
      maxX2 = Math.max(maxX2, x);
      minY2 = Math.min(minY2, y);
      maxY2 = Math.max(maxY2, y);
    }
    
    const isLowSaturation = hsl.s < 12;
    const isMidLightness = hsl.l > 18 && hsl.l < 58;
    const maxRGB = Math.max(r, g, b);
    const minRGB = Math.min(r, g, b);
    const rgbSpread = maxRGB - minRGB;
    const isRgbGray = rgbSpread < 20 && r > 40 && r < 150;
    
    const shouldBeTransparent = (isLowSaturation && isMidLightness) || isRgbGray;
    
    rgbaData2[dstIdx] = r;
    rgbaData2[dstIdx + 1] = g;
    rgbaData2[dstIdx + 2] = b;
    rgbaData2[dstIdx + 3] = shouldBeTransparent ? 0 : 255;
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

extractButtonClean().catch(console.error);
