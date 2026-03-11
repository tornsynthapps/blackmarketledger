import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

async function rmrf(target) {
  await fs.rm(target, { recursive: true, force: true });
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === 'dist' || e.name === 'scripts') continue;
    const s = path.join(src, e.name);
    const d = path.join(dest, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

async function zipFolder(folderPath, zipPath) {
  const cwd = path.dirname(folderPath);
  const base = path.basename(folderPath);
  await execFileAsync('zip', ['-rq', zipPath, base], { cwd });
}

async function main() {
  await rmrf(dist);
  await fs.mkdir(dist, { recursive: true });

  const chromeDir = path.join(dist, 'chrome');
  const firefoxDir = path.join(dist, 'firefox');

  await copyDir(root, chromeDir);
  await copyDir(root, firefoxDir);

  const firefoxManifestPath = path.join(firefoxDir, 'manifest.json');
  const firefoxManifest = JSON.parse(await fs.readFile(firefoxManifestPath, 'utf8'));
  firefoxManifest.browser_specific_settings = {
    gecko: {
      id: 'bmlconnect@blackmarketledger.web.app'
    }
  };
  await fs.writeFile(firefoxManifestPath, JSON.stringify(firefoxManifest, null, 2));

  await zipFolder(chromeDir, path.join(dist, 'bmlconnect-chrome.zip'));
  await zipFolder(firefoxDir, path.join(dist, 'bmlconnect-firefox.zip'));

  console.log('Built extension packages:');
  console.log('- dist/bmlconnect-chrome.zip');
  console.log('- dist/bmlconnect-firefox.zip');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
