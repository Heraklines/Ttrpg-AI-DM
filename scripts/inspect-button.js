const sharp = require('sharp');

async function inspectButton() {
  const { data, info } = await sharp('C:/Users/micha/Dnd_App/public/ui/button-primary.png')
    .raw()
    .toBuffer({ resolveWithObject: true });
  
  console.log('Button:', info.width, 'x', info.height, 'channels:', info.channels);
  
  // Sample corners and edges
  const samples = [
    { x: 5, y: 5, name: 'top-left corner' },
    { x: info.width - 6, y: 5, name: 'top-right corner' },
    { x: 5, y: info.height - 6, name: 'bottom-left corner' },
    { x: info.width - 6, y: info.height - 6, name: 'bottom-right corner' },
    { x: 5, y: Math.floor(info.height / 2), name: 'left edge' },
    { x: info.width - 6, y: Math.floor(info.height / 2), name: 'right edge' },
    { x: Math.floor(info.width / 2), y: 5, name: 'top edge' },
    { x: Math.floor(info.width / 2), y: info.height - 6, name: 'bottom edge' },
  ];
  
  console.log('\n=== Checking if edges are transparent ===');
  for (const s of samples) {
    const idx = (s.y * info.width + s.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const a = info.channels === 4 ? data[idx + 3] : 255;
    console.log(`${s.name}: rgba(${r}, ${g}, ${b}, ${a}) - ${a === 0 ? 'TRANSPARENT' : 'OPAQUE'}`);
  }
  
  // Count transparent vs opaque
  let transparent = 0, opaque = 0;
  for (let i = 0; i < info.width * info.height; i++) {
    const idx = i * info.channels;
    const a = info.channels === 4 ? data[idx + 3] : 255;
    if (a === 0) transparent++;
    else opaque++;
  }
  
  console.log('\nTotal transparent:', transparent, '(' + (transparent / (info.width * info.height) * 100).toFixed(1) + '%)');
  console.log('Total opaque:', opaque, '(' + (opaque / (info.width * info.height) * 100).toFixed(1) + '%)');
  
  // Check for the glow area around edges
  console.log('\n=== Checking glow area (20px from edge) ===');
  const glowSamples = [
    { x: 20, y: 20, name: 'near top-left' },
    { x: info.width - 21, y: 20, name: 'near top-right' },
    { x: 20, y: info.height - 21, name: 'near bottom-left' },
    { x: info.width - 21, y: info.height - 21, name: 'near bottom-right' },
  ];
  
  for (const s of glowSamples) {
    const idx = (s.y * info.width + s.x) * info.channels;
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    const a = info.channels === 4 ? data[idx + 3] : 255;
    console.log(`${s.name}: rgba(${r}, ${g}, ${b}, ${a}) - ${a === 0 ? 'TRANSPARENT' : 'OPAQUE'}`);
  }
}

inspectButton().catch(console.error);
