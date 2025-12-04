const sharp = require('sharp');

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

async function fixButton(srcPath, dstPath) {
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  console.log('Processing:', srcPath, '-', info.width, 'x', info.height);
  
  const rgbaData = Buffer.alloc(info.width * info.height * 4);
  let transparent = 0;
  
  for (let i = 0; i < info.width * info.height; i++) {
    const srcIdx = i * info.channels;
    const dstIdx = i * 4;
    const r = data[srcIdx], g = data[srcIdx + 1], b = data[srcIdx + 2];
    const hsl = rgbToHsl(r, g, b);
    
    const isBackground = hsl.s < 8 && hsl.l > 20 && hsl.l < 55;
    
    rgbaData[dstIdx] = r;
    rgbaData[dstIdx + 1] = g;
    rgbaData[dstIdx + 2] = b;
    rgbaData[dstIdx + 3] = isBackground ? 0 : 255;
    
    if (isBackground) transparent++;
  }
  
  console.log('Transparent:', (transparent / (info.width * info.height) * 100).toFixed(1) + '%');
  
  await sharp(rgbaData, {
    raw: { width: info.width, height: info.height, channels: 4 }
  }).png().toFile(dstPath);
  
  console.log('Saved:', dstPath, '\n');
}

async function main() {
  await fixButton('public/ui/backup/button-secondary.png', 'public/ui/button-secondary.png');
}

main().catch(console.error);
