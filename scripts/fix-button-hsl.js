const sharp = require('sharp');

// Convert RGB to HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
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

async function fixButtonWithHSL() {
  const srcPath = 'public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('Processing', info.width, 'x', info.height, 'image');
  
  // Create RGBA output
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  
  let stats = {
    grayByHsl: 0,
    colorful: 0,
    darkGray: 0,
    lightGray: 0
  };
  
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    
    const r = data[srcIdx];
    const g = data[srcIdx + 1];
    const b = data[srcIdx + 2];
    
    const hsl = rgbToHsl(r, g, b);
    
    // Gray detection: low saturation AND within gray lightness range
    // The background gray is around rgb(60-125, 60-125, 60-125) = low saturation
    // Button content has warm brown/gold = higher saturation
    
    const isGray = hsl.s < 8; // Very low saturation = gray
    const isNeutralLightness = hsl.l > 20 && hsl.l < 55; // Mid-gray range
    const isBackground = isGray && isNeutralLightness;
    
    // Also check for pure black/near-black (shadows might be gray too)
    const isVeryDark = hsl.l < 15 && hsl.s < 15;
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    
    if (isBackground) {
      rgbaData[dstIdx + 3] = 0; // Transparent
      if (hsl.l < 35) stats.darkGray++;
      else stats.lightGray++;
    } else {
      rgbaData[dstIdx + 3] = 255; // Opaque
      if (isGray) stats.grayByHsl++;
      else stats.colorful++;
    }
  }
  
  const total = info.width * info.height;
  console.log('\n=== HSL-based Detection Stats ===');
  console.log('Transparent (gray bg):', ((stats.darkGray + stats.lightGray) / total * 100).toFixed(1) + '%');
  console.log('  - Dark gray:', (stats.darkGray / total * 100).toFixed(1) + '%');
  console.log('  - Light gray:', (stats.lightGray / total * 100).toFixed(1) + '%');
  console.log('Opaque (content):', ((stats.grayByHsl + stats.colorful) / total * 100).toFixed(1) + '%');
  console.log('  - Colorful:', (stats.colorful / total * 100).toFixed(1) + '%');
  console.log('  - Gray-ish:', (stats.grayByHsl / total * 100).toFixed(1) + '%');
  
  // Save with HSL-based transparency
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
  .png()
  .toFile('public/ui/button-primary-hsl.png');
  
  console.log('\nSaved: public/ui/button-primary-hsl.png');
  
  // Now find actual content bounds to see the aspect ratio
  let minX = info.width, maxX = 0, minY = info.height, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const idx = (y * info.width + x) * 4;
      if (rgbaData[idx + 3] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  const contentWidth = maxX - minX + 1;
  const contentHeight = maxY - minY + 1;
  console.log('\nContent bounds:', minX, minY, 'to', maxX, maxY);
  console.log('Content size:', contentWidth, 'x', contentHeight);
  console.log('Aspect ratio:', (contentWidth / contentHeight).toFixed(2));
  
  // Also create a cropped version
  if (minX > 5 || minY > 5) {
    const padding = 5;
    await sharp(rgbaData, {
      raw: { width: info.width, height: info.height, channels: 4 }
    })
    .extract({
      left: Math.max(0, minX - padding),
      top: Math.max(0, minY - padding),
      width: Math.min(info.width - minX + padding, contentWidth + padding * 2),
      height: Math.min(info.height - minY + padding, contentHeight + padding * 2)
    })
    .png()
    .toFile('public/ui/button-primary-cropped.png');
    
    console.log('Saved cropped: public/ui/button-primary-cropped.png');
  }
}

fixButtonWithHSL().catch(console.error);
