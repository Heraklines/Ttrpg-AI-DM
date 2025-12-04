const sharp = require('sharp');
const fs = require('fs');

async function analyzeAndFixButton() {
  const srcPath = 'public/ui/backup/button-primary.png';
  
  // Load the image
  const { data, info } = await sharp(srcPath)
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('=== Button Analysis ===');
  console.log('Size:', info.width, 'x', info.height);
  console.log('Channels:', info.channels);
  
  // Sample colors from corners (should be background)
  const corners = [
    { x: 5, y: 5, name: 'top-left' },
    { x: info.width - 6, y: 5, name: 'top-right' },
    { x: 5, y: info.height - 6, name: 'bottom-left' },
    { x: info.width - 6, y: info.height - 6, name: 'bottom-right' },
  ];
  
  console.log('\n=== Corner Colors (Background) ===');
  const bgColors = [];
  for (const corner of corners) {
    const idx = (corner.y * info.width + corner.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    console.log(`${corner.name}: rgb(${r}, ${g}, ${b})`);
    bgColors.push({ r, g, b });
  }
  
  // Calculate average background color
  const avgBg = {
    r: Math.round(bgColors.reduce((s, c) => s + c.r, 0) / bgColors.length),
    g: Math.round(bgColors.reduce((s, c) => s + c.g, 0) / bgColors.length),
    b: Math.round(bgColors.reduce((s, c) => s + c.b, 0) / bgColors.length),
  };
  console.log(`\nAverage background: rgb(${avgBg.r}, ${avgBg.g}, ${avgBg.b})`);
  
  // Sample center colors
  console.log('\n=== Center/Button Colors ===');
  const centerSamples = [
    { x: Math.floor(info.width / 2), y: Math.floor(info.height / 2), name: 'center' },
    { x: Math.floor(info.width / 4), y: Math.floor(info.height / 2), name: 'left-mid' },
    { x: Math.floor(info.width * 3 / 4), y: Math.floor(info.height / 2), name: 'right-mid' },
  ];
  
  for (const sample of centerSamples) {
    const idx = (sample.y * info.width + sample.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    console.log(`${sample.name}: rgb(${r}, ${g}, ${b})`);
  }
  
  // Try different tolerance levels
  console.log('\n=== Testing Different Tolerances ===');
  for (const tolerance of [10, 15, 20, 25, 30, 40]) {
    let transparent = 0;
    for (let i = 0; i < info.width * info.height; i++) {
      const idx = i * info.channels;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      
      const isGray = Math.abs(r - avgBg.r) <= tolerance &&
                     Math.abs(g - avgBg.g) <= tolerance &&
                     Math.abs(b - avgBg.b) <= tolerance;
      if (isGray) transparent++;
    }
    const pct = (transparent / (info.width * info.height) * 100).toFixed(1);
    console.log(`Tolerance ${tolerance}: ${pct}% would be transparent`);
  }
  
  // Check color distribution along a horizontal line through center
  console.log('\n=== Horizontal Scan (Y = center) ===');
  const scanY = Math.floor(info.height / 2);
  let inButton = false;
  let transitions = [];
  
  for (let x = 0; x < info.width; x++) {
    const idx = (scanY * info.width + x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    
    const isGray = Math.abs(r - avgBg.r) <= 20 &&
                   Math.abs(g - avgBg.g) <= 20 &&
                   Math.abs(b - avgBg.b) <= 20;
    
    if (!isGray && !inButton) {
      inButton = true;
      transitions.push({ x, type: 'start' });
    } else if (isGray && inButton) {
      inButton = false;
      transitions.push({ x, type: 'end' });
    }
  }
  
  console.log('Transitions:', transitions);
  if (transitions.length >= 2) {
    const buttonWidth = transitions[1].x - transitions[0].x;
    console.log('Detected button width:', buttonWidth, 'px');
    console.log('Button starts at X:', transitions[0].x);
  }
  
  // Also scan vertically
  console.log('\n=== Vertical Scan (X = center) ===');
  const scanX = Math.floor(info.width / 2);
  inButton = false;
  transitions = [];
  
  for (let y = 0; y < info.height; y++) {
    const idx = (y * info.width + scanX) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    
    const isGray = Math.abs(r - avgBg.r) <= 20 &&
                   Math.abs(g - avgBg.g) <= 20 &&
                   Math.abs(b - avgBg.b) <= 20;
    
    if (!isGray && !inButton) {
      inButton = true;
      transitions.push({ y, type: 'start' });
    } else if (isGray && inButton) {
      inButton = false;
      transitions.push({ y, type: 'end' });
    }
  }
  
  console.log('Transitions:', transitions);
  if (transitions.length >= 2) {
    const buttonHeight = transitions[1].y - transitions[0].y;
    console.log('Detected button height:', buttonHeight, 'px');
    console.log('Button starts at Y:', transitions[0].y);
  }
}

analyzeAndFixButton().catch(console.error);
