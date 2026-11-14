import fs from 'node:fs';
import path from 'node:path';

const assetsDir = path.resolve('dist/assets');
if (!fs.existsSync(assetsDir)) {
  console.error('Bundle budget check failed: dist/assets does not exist. Run npm run build first.');
  process.exit(1);
}

const jsFiles = fs.readdirSync(assetsDir).filter((file) => file.endsWith('.js'));
const totalBytes = jsFiles.reduce((sum, file) => sum + fs.statSync(path.join(assetsDir, file)).size, 0);
const threeFiles = jsFiles.filter((file) => file.startsWith('vendor-3d-'));
const threeBytes = threeFiles.reduce((sum, file) => sum + fs.statSync(path.join(assetsDir, file)).size, 0);
const totalLimit = 2.5 * 1024 * 1024;
const threeLimit = 1.2 * 1024 * 1024;

console.log(`Total JavaScript: ${(totalBytes / 1024).toFixed(1)} KiB / ${(totalLimit / 1024).toFixed(0)} KiB`);
console.log(`3D JavaScript: ${(threeBytes / 1024).toFixed(1)} KiB / ${(threeLimit / 1024).toFixed(0)} KiB`);
if (threeFiles.length === 0) {
  console.error('Bundle budget check failed: the isolated vendor-3d chunk was not emitted.');
  process.exit(1);
}
if (totalBytes > totalLimit || threeBytes > threeLimit) {
  console.error('Bundle budget exceeded. Review lazy loading, manual chunks and 3D dependencies.');
  process.exit(1);
}
