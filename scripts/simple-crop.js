const sharp = require('sharp');

async function simpleButtonExtract() {
  // Just crop the original image to the button bounds - NO transparency manipulation
  // The button will have its original glow intact
  
  const srcPath = 'C:/Users/micha/Dnd_App/public/ui/backup/button-primary.png';
  
  // From our analysis, the button content is roughly:
  // X: 44-980, Y: 317-695
  // Let's crop with a bit of padding for the glow
  
  const cropX = 30;
  const cropY = 305;
  const cropW = 965;
  const cropH = 410;
  
  await sharp(srcPath)
    .extract({ left: cropX, top: cropY, width: cropW, height: cropH })
    .png()
    .toFile('C:/Users/micha/Dnd_App/public/ui/button-primary-crop.png');
  
  console.log('Saved button-primary-crop.png:', cropW, 'x', cropH);
  
  // Secondary button
  const src2 = 'C:/Users/micha/Dnd_App/public/ui/backup/button-secondary.png';
  
  await sharp(src2)
    .extract({ left: 50, top: 350, width: 920, height: 320 })
    .png()
    .toFile('C:/Users/micha/Dnd_App/public/ui/button-secondary-crop.png');
  
  console.log('Saved button-secondary-crop.png');
}

simpleButtonExtract().catch(console.error);
