const sharp = require('sharp');

async function analyzeGlowArea() {
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  const { data, info } = await sharp(srcPath).raw().toBuffer({ resolveWithObject: true });
  
  console.log('Analyzing the glow/checkered area...\n');
  
  // Sample a line through the left glow area (where checkered pattern appears)
  // Based on the image, the glow is around x=20-60, y around 350 (middle)
  console.log('=== Horizontal scan through left glow area (y=400) ===');
  const y = 400;
  for (let x = 0; x < 100; x += 5) {
    const idx = (y * info.width + x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const brightness = Math.round((r + g + b) / 3);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    console.log(`x=${x.toString().padStart(3)}: rgb(${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)}) bright=${brightness} spread=${spread}`);
  }
  
  // The glow shows bright areas (high brightness) that alternate (checkered)
  // Let's look at the transition from background to button
  console.log('\n=== Vertical scan through top-left corner (x=50) ===');
  const x = 50;
  for (let y2 = 300; y2 < 400; y2 += 5) {
    const idx = (y2 * info.width + x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const brightness = Math.round((r + g + b) / 3);
    const spread = Math.max(r, g, b) - Math.min(r, g, b);
    console.log(`y=${y2}: rgb(${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)}) bright=${brightness} spread=${spread}`);
  }
  
  // Check the checkered pattern - light and dark squares
  console.log('\n=== Checking checkered pattern (top-left area) ===');
  for (let y3 = 320; y3 < 340; y3++) {
    let row = '';
    for (let x3 = 20; x3 < 60; x3++) {
      const idx = (y3 * info.width + x3) * info.channels;
      const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      row += brightness > 100 ? '#' : '.';
    }
    console.log(`y=${y3}: ${row}`);
  }
}

analyzeGlowArea().catch(console.error);
