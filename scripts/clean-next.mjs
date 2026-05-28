import fs from 'fs';
import path from 'path';

for (const name of ['.next', 'dist']) {
  const dir = path.join(process.cwd(), name);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`Removed ${name}/`);
  }
}
