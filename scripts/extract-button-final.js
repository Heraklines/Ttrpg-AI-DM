const sharp = require('sharp');

async function extractButtonFinal() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Source:', info.width, 'x', info.height);
  
  // Sample the checkered area to understand its colors
  console.log('\n=== Sampling checkered border area ===');
  const samples = [
    { x: 10, y: 350 },   // Left edge
    { x: 1014, y: 350 }, // Right edge  
    { x: 512, y: 310 },  // Top edge
    { x: 512, y: 705 },  // Bottom edge
    { x: 50, y: 320 },   // Corner area
  ];
  
  for (const s of samples) {
    const idx = (s.y * info.width + s.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    console.log(`(${s.x}, ${s.y}): rgb(${r}, ${g}, ${b})`);
  }
  
  // Sample the golden glow to see its color
  console.log('\n=== Sampling golden glow area ===');
  const glowSamples = [
    { x: 60, y: 340 },
    { x: 960, y: 340 },
    { x: 512, y: 325 },
  ];
  
  for (const s of glowSamples) {
    const idx = (s.y * info.width + s.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const spread = max - min;
    console.log(`(${s.x}, ${s.y}): rgb(${r}, ${g}, ${b}) spread=${spread}`);
  }
  
  // The key insight: the checkered pattern alternates between two gray tones
  // We need to detect BOTH the dark gray AND the light gray squares
  // The glow should have more yellow (r > b, g > b)
  
  function isGrayBackground(r, g, b) {
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    const brightness = (r + g + b) / 3;
    
    // Gray has very low color spread (r ≈ g ≈ b)
    // AND is in the mid-brightness range (not too dark, not too bright)
    if (spread < 25 && brightness > 35 && brightness < 160) {
      return true;
    }
    
    // Also catch slightly tinted grays
    if (spread < 35 && brightness > 50 && brightness < 140) {
      // Check if it's truly gray vs golden glow
      // Golden glow has r > b and g > b significantly
      const isGolden = (r - b > 30) || (g - b > 30);
      if (!isGolden) return true;
    }
    
    return false;
  }
  
  // Find content bounds
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      if (!isGrayBackground(r, g, b)) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('\nButton bounds:', minX, minY, 'to', maxX, maxY);
  
  // Create RGBA
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  let transparentCount = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isGrayBackground(r, g, b) ? 0 : 255;
    
    if (isGrayBackground(r, g, b)) transparentCount++;
  }
  
  console.log('Transparent:', (transparentCount / (info.width * info.height) * 100).toFixed(1) + '%');
  
  // Crop
  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(info.width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(info.height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Crop:', cropW, 'x', cropH);
  
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
  .png()
  .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary.png');
  
  console.log('Saved: button-primary.png');
  
  // Secondary button
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
    
    if (!isGrayBackground(r, g, b)) {
      minX2 = Math.min(minX2, x);
      maxX2 = Math.max(maxX2, x);
      minY2 = Math.min(minY2, y);
      maxY2 = Math.max(maxY2, y);
    }
    
    rgbaData2[dstIdx] = r;
    rgbaData2[dstIdx + 1] = g;
    rgbaData2[dstIdx + 2] = b;
    rgbaData2[dstIdx + 3] = isGrayBackground(r, g, b) ? 0 : 255;
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

extractButtonFinal().catch(console.error);
