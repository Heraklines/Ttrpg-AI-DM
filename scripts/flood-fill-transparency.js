const { Jimp } = require('jimp');

async function floodFillTransparency() {
  console.log('Loading image...');
  const image = await Jimp.read('C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png');
  
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  
  console.log('Image size:', width, 'x', height);
  
  // Get the background color from corner (should be gray ~61,61,61)
  const cornerColor = Jimp.intToRGBA(image.getPixelColor(5, 5));
  console.log('Corner color:', cornerColor);
  
  // Create a visited map
  const visited = new Set();
  const toMakeTransparent = new Set();
  
  // Color similarity check - is this pixel similar to the background gray?
  function isSimilarToBackground(x, y) {
    const color = Jimp.intToRGBA(image.getPixelColor(x, y));
    const r = color.r, g = color.g, b = color.b;
    
    // Check if it's a gray color (low saturation)
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    
    // Gray has spread < 25 (r ≈ g ≈ b)
    // Allow brightness range from 40-140 to catch both dark and light gray squares
    const brightness = (r + g + b) / 3;
    
    return spread < 25 && brightness > 40 && brightness < 145;
  }
  
  // Flood fill from starting points
  function floodFill(startX, startY) {
    const stack = [[startX, startY]];
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      visited.add(key);
      
      if (isSimilarToBackground(x, y)) {
        toMakeTransparent.add(key);
        
        // Add neighbors (4-connected)
        stack.push([x + 1, y]);
        stack.push([x - 1, y]);
        stack.push([x, y + 1]);
        stack.push([x, y - 1]);
      }
    }
  }
  
  console.log('Flood filling from corners...');
  
  // Start flood fill from multiple points along all edges
  // Top edge
  for (let x = 0; x < width; x += 10) {
    floodFill(x, 0);
    floodFill(x, 5);
  }
  // Bottom edge
  for (let x = 0; x < width; x += 10) {
    floodFill(x, height - 1);
    floodFill(x, height - 6);
  }
  // Left edge
  for (let y = 0; y < height; y += 10) {
    floodFill(0, y);
    floodFill(5, y);
  }
  // Right edge
  for (let y = 0; y < height; y += 10) {
    floodFill(width - 1, y);
    floodFill(width - 6, y);
  }
  
  console.log('Pixels to make transparent:', toMakeTransparent.size);
  console.log('Percentage:', (toMakeTransparent.size / (width * height) * 100).toFixed(1) + '%');
  
  // Apply transparency
  console.log('Applying transparency...');
  for (const key of toMakeTransparent) {
    const [x, y] = key.split(',').map(Number);
    // Set alpha to 0 (transparent)
    const color = Jimp.intToRGBA(image.getPixelColor(x, y));
    image.setPixelColor(Jimp.rgbaToInt(color.r, color.g, color.b, 0), x, y);
  }
  
  // Find bounding box of non-transparent pixels
  let minX = width, maxX = 0, minY = height, maxY = 0;
  
  image.scan(0, 0, width, height, function(x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    if (alpha > 0) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  });
  
  console.log('Content bounds:', minX, minY, 'to', maxX, maxY);
  
  // Crop to content
  const padding = 2;
  const cropX = Math.max(0, minX - padding);
  const cropY = Math.max(0, minY - padding);
  const cropW = Math.min(width - cropX, maxX - minX + 1 + padding * 2);
  const cropH = Math.min(height - cropY, maxY - minY + 1 + padding * 2);
  
  console.log('Cropping to:', cropW, 'x', cropH);
  
  image.crop(cropX, cropY, cropW, cropH);
  
  await image.writeAsync('C:/Users/micha/Dnd_App/public/ui/button-primary-flood.png');
  console.log('Saved: button-primary-flood.png');
  
  // Process secondary button
  console.log('\nProcessing secondary button...');
  const image2 = await Jimp.read('C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png');
  
  const width2 = image2.bitmap.width;
  const height2 = image2.bitmap.height;
  
  const visited2 = new Set();
  const toMakeTransparent2 = new Set();
  
  function isSimilarToBackground2(x, y) {
    const color = Jimp.intToRGBA(image2.getPixelColor(x, y));
    const r = color.r, g = color.g, b = color.b;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const spread = max - min;
    const brightness = (r + g + b) / 3;
    return spread < 25 && brightness > 40 && brightness < 145;
  }
  
  function floodFill2(startX, startY) {
    const stack = [[startX, startY]];
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const key = `${x},${y}`;
      if (visited2.has(key)) continue;
      if (x < 0 || x >= width2 || y < 0 || y >= height2) continue;
      visited2.add(key);
      if (isSimilarToBackground2(x, y)) {
        toMakeTransparent2.add(key);
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    }
  }
  
  for (let x = 0; x < width2; x += 10) {
    floodFill2(x, 0); floodFill2(x, 5);
    floodFill2(x, height2 - 1); floodFill2(x, height2 - 6);
  }
  for (let y = 0; y < height2; y += 10) {
    floodFill2(0, y); floodFill2(5, y);
    floodFill2(width2 - 1, y); floodFill2(width2 - 6, y);
  }
  
  console.log('Secondary transparent pixels:', toMakeTransparent2.size);
  
  for (const key of toMakeTransparent2) {
    const [x, y] = key.split(',').map(Number);
    const color = Jimp.intToRGBA(image2.getPixelColor(x, y));
    image2.setPixelColor(Jimp.rgbaToInt(color.r, color.g, color.b, 0), x, y);
  }
  
  let minX2 = width2, maxX2 = 0, minY2 = height2, maxY2 = 0;
  image2.scan(0, 0, width2, height2, function(x, y, idx) {
    if (this.bitmap.data[idx + 3] > 0) {
      minX2 = Math.min(minX2, x);
      maxX2 = Math.max(maxX2, x);
      minY2 = Math.min(minY2, y);
      maxY2 = Math.max(maxY2, y);
    }
  });
  
  const cropX2 = Math.max(0, minX2 - padding);
  const cropY2 = Math.max(0, minY2 - padding);
  const cropW2 = Math.min(width2 - cropX2, maxX2 - minX2 + 1 + padding * 2);
  const cropH2 = Math.min(height2 - cropY2, maxY2 - minY2 + 1 + padding * 2);
  
  image2.crop(cropX2, cropY2, cropW2, cropH2);
  await image2.writeAsync('C:/Users/micha/Dnd_App/public/ui/button-secondary-flood.png');
  console.log('Saved: button-secondary-flood.png', cropW2, 'x', cropH2);
}

floodFillTransparency().catch(console.error);
