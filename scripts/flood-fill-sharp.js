const sharp = require('sharp');

async function floodFillTransparency() {
  console.log('Loading image...');
  const { data, info } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const width = info.width;
  const height = info.height;
  const channels = info.channels;
  
  console.log('Image size:', width, 'x', height, 'channels:', channels);
  
  // Create output buffer with alpha channel
  const output = Buffer.alloc(width * height * 4);
  
  // Copy RGB and set alpha to 255 initially
  for (let i = 0; i < width * height; i++) {
    output[i * 4] = data[i * channels];
    output[i * 4 + 1] = data[i * channels + 1];
    output[i * 4 + 2] = data[i * channels + 2];
    output[i * 4 + 3] = 255; // Fully opaque
  }
  
  // Helper to get pixel
  function getPixel(x, y) {
    const idx = (y * width + x) * channels;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2] };
  }
  
  // Check if pixel is gray (background)
  function isGray(x, y) {
    const { r, g, b } = getPixel(x, y);
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    const brightness = (r + g + b) / 3;
    // Gray: low color spread, mid brightness
    return spread < 30 && brightness > 35 && brightness < 150;
  }
  
  // Flood fill using iterative approach with queue
  const visited = new Uint8Array(width * height);
  const toMakeTransparent = [];
  
  function floodFill(startX, startY) {
    const queue = [[startX, startY]];
    let head = 0;
    
    while (head < queue.length) {
      const [x, y] = queue[head++];
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const idx = y * width + x;
      if (visited[idx]) continue;
      visited[idx] = 1;
      
      if (isGray(x, y)) {
        toMakeTransparent.push(idx);
        // Add 4-connected neighbors
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  }
  
  console.log('Flood filling from edges...');
  
  // Start from all edge pixels
  for (let x = 0; x < width; x++) {
    floodFill(x, 0);
    floodFill(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    floodFill(0, y);
    floodFill(width - 1, y);
  }
  
  console.log('Pixels to make transparent:', toMakeTransparent.length);
  console.log('Percentage:', (toMakeTransparent.length / (width * height) * 100).toFixed(1) + '%');
  
  // Apply transparency
  for (const idx of toMakeTransparent) {
    output[idx * 4 + 3] = 0; // Set alpha to 0
  }
  
  // Find bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (output[idx * 4 + 3] > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  
  console.log('Content bounds:', minX, minY, 'to', maxX, maxY);
  
  // Save with crop
  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Final size:', cropW, 'x', cropH);
  
  await sharp(output, { raw: { width, height, channels: 4 } })
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png()
    .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary-flood.png');
  
  console.log('Saved: button-primary-flood.png');
  
  // Process secondary button
  console.log('\nProcessing secondary...');
  const { data: data2, info: info2 } = await sharp('C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  const w2 = info2.width, h2 = info2.height, ch2 = info2.channels;
  const output2 = Buffer.alloc(w2 * h2 * 4);
  
  for (let i = 0; i < w2 * h2; i++) {
    output2[i * 4] = data2[i * ch2];
    output2[i * 4 + 1] = data2[i * ch2 + 1];
    output2[i * 4 + 2] = data2[i * ch2 + 2];
    output2[i * 4 + 3] = 255;
  }
  
  function getPixel2(x, y) {
    const idx = (y * w2 + x) * ch2;
    return { r: data2[idx], g: data2[idx + 1], b: data2[idx + 2] };
  }
  
  function isGray2(x, y) {
    const { r, g, b } = getPixel2(x, y);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    const brightness = (r + g + b) / 3;
    return spread < 30 && brightness > 35 && brightness < 150;
  }
  
  const visited2 = new Uint8Array(w2 * h2);
  const trans2 = [];
  
  function floodFill2(startX, startY) {
    const queue = [[startX, startY]];
    let head = 0;
    while (head < queue.length) {
      const [x, y] = queue[head++];
      if (x < 0 || x >= w2 || y < 0 || y >= h2) continue;
      const idx = y * w2 + x;
      if (visited2[idx]) continue;
      visited2[idx] = 1;
      if (isGray2(x, y)) {
        trans2.push(idx);
        queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  }
  
  for (let x = 0; x < w2; x++) { floodFill2(x, 0); floodFill2(x, h2 - 1); }
  for (let y = 0; y < h2; y++) { floodFill2(0, y); floodFill2(w2 - 1, y); }
  
  console.log('Secondary transparent:', trans2.length);
  
  for (const idx of trans2) output2[idx * 4 + 3] = 0;
  
  let minX2 = w2, maxX2 = 0, minY2 = h2, maxY2 = 0;
  for (let y = 0; y < h2; y++) {
    for (let x = 0; x < w2; x++) {
      if (output2[(y * w2 + x) * 4 + 3] > 0) {
        minX2 = Math.min(minX2, x); maxX2 = Math.max(maxX2, x);
        minY2 = Math.min(minY2, y); maxY2 = Math.max(maxY2, y);
      }
    }
  }
  
  const cX2 = Math.max(0, minX2 - padding);
  const cY2 = Math.max(0, minY2 - padding);
  const cW2 = Math.min(w2 - cX2, maxX2 - minX2 + 1 + padding * 2);
  const cH2 = Math.min(h2 - cY2, maxY2 - minY2 + 1 + padding * 2);
  
  await sharp(output2, { raw: { width: w2, height: h2, channels: 4 } })
    .extract({ left: cX2, top: cY2, width: cW2, height: cH2 })
    .png()
    .toFile('C:/Users/micha/Dnd_App/public/ui/button-secondary-flood.png');
  
  console.log('Saved: button-secondary-flood.png', cW2, 'x', cH2);
}

floodFillTransparency().catch(console.error);
