import fs from 'fs';
import path from 'path';

const appRoot = 'src/app';

function removeDir(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) removeDir(full);
    else fs.unlinkSync(full);
  }
  fs.rmdirSync(dir);
}

for (const entry of fs.readdirSync(appRoot, { withFileTypes: true, recursive: true })) {
  // handled below
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (!entry.isDirectory()) continue;
    if (entry.name === 'page') {
      const parent = path.dirname(full);
      const siblings = fs.readdirSync(parent);
      if (siblings.includes('page.tsx')) {
        removeDir(full);
        console.log('Removed duplicate nested route:', full);
        continue;
      }
    }
    walk(full);
  }
}

walk(appRoot);

try {
  if (fs.existsSync('src/pages')) {
    fs.renameSync('src/pages', 'src/_pages_vite_legacy');
    console.log('Renamed src/pages -> src/_pages_vite_legacy');
  }
} catch (error) {
  console.warn('Could not rename src/pages (stop dev server if locked):', error.message);
}

console.log('Cleanup done.');
