import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

async function makeZip() {
  const zip = new JSZip();
  const htmlContent = fs.readFileSync(path.resolve('public/standalone.html'), 'utf8');
  const cssContent = fs.readFileSync(path.resolve('public/style.css'), 'utf8');
  const jsContent = fs.readFileSync(path.resolve('public/game.js'), 'utf8');
  const readmeContent = fs.readFileSync(path.resolve('README.md'), 'utf8');

  zip.file('index.html', htmlContent);
  zip.file('style.css', cssContent);
  zip.file('game.js', jsContent);
  zip.file('README.md', readmeContent);

  const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  fs.writeFileSync(path.resolve('public/snake_game_realistic_v5.zip'), content);
  fs.writeFileSync(path.resolve('snake_game_realistic_v5.zip'), content);
  console.log('Zip file generated successfully! Size:', content.length, 'bytes');
}

makeZip().catch(console.error);
