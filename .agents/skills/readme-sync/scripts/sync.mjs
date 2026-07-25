import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();

const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.wrangler',
  '.kilo',
  '.kilocode',
  '.vscode',
  'dist',
  'build',
  '.turbo'
]);

function getRelativePath(fullPath) {
  return path.relative(rootDir, fullPath).replace(/\\/g, '/');
}

function extractExports(fileContent, ext) {
  const exports = [];
  if (['.ts', '.tsx', '.js', '.mjs', '.jsx'].includes(ext)) {
    const classMatches = [...fileContent.matchAll(/export\s+(?:abstract\s+)?class\s+([A-Za-z0-9_]+)/g)];
    for (const m of classMatches) exports.push(`Class: \`${m[1]}\``);

    const funcMatches = [...fileContent.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z0-9_]+)/g)];
    for (const m of funcMatches) exports.push(`Function: \`${m[1]}()\``);

    const constFuncMatches = [...fileContent.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(/g)];
    for (const m of constFuncMatches) exports.push(`Function: \`${m[1]}()\``);

    const constObjMatches = [...fileContent.matchAll(/export\s+const\s+([A-Za-z0-9_]+)\s*=\s*\{/g)];
    for (const m of constObjMatches) exports.push(`Object/Const: \`${m[1]}\``);

    const interfaceMatches = [...fileContent.matchAll(/export\s+interface\s+([A-Za-z0-9_]+)/g)];
    for (const m of interfaceMatches) exports.push(`Interface: \`${m[1]}\``);

    const typeMatches = [...fileContent.matchAll(/export\s+type\s+([A-Za-z0-9_]+)/g)];
    for (const m of typeMatches) exports.push(`Type: \`${m[1]}\``);
  }
  return [...new Set(exports)];
}

function syncDirectoryReadme(dirPath) {
  const relPath = getRelativePath(dirPath);
  if (relPath === '') return; // Skip root README.md

  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  const subdirs = [];
  const files = [];

  for (const item of items) {
    if (item.name.startsWith('.')) {
      if (item.name !== '.agents' && item.name !== '.github') continue;
    }
    if (EXCLUDED_DIRS.has(item.name)) continue;

    if (item.isDirectory()) {
      subdirs.push(item.name);
    } else if (item.name !== 'README.md') {
      files.push(item.name);
    }
  }

  const folderName = path.basename(dirPath);
  const readmePath = path.join(dirPath, 'README.md');

  let markdown = `# ${folderName}\n\n`;
  markdown += `Directory path: \`${relPath}\`\n\n`;
  markdown += `## Purpose\n\n`;
  markdown += `Provides specific functionality and resources for the \`${folderName}\` module.\n\n`;

  if (subdirs.length > 0) {
    markdown += `## Subdirectories\n\n`;
    for (const sub of subdirs.sort()) {
      markdown += `- \`${sub}/\`: Subdirectory containing related module files.\n`;
    }
    markdown += `\n`;
  }

  if (files.length > 0) {
    markdown += `## Files & Contents\n\n`;
    for (const file of files.sort()) {
      const filePath = path.join(dirPath, file);
      const ext = path.extname(file);
      let fileContent = '';
      try {
        fileContent = fs.readFileSync(filePath, 'utf8');
      } catch (e) {}

      const exports = extractExports(fileContent, ext);
      markdown += `- **\`${file}\`**: Module file.\n`;
      if (exports.length > 0) {
        markdown += `  - **Exports**: ${exports.join(', ')}\n`;
      }
    }
    markdown += `\n`;
  }

  fs.writeFileSync(readmePath, markdown, 'utf8');
  console.log(`Synced README: ${readmePath}`);
}

const targetArg = process.argv[2];
if (targetArg) {
  const targetDir = path.isAbsolute(targetArg) ? targetArg : path.join(rootDir, targetArg);
  if (fs.existsSync(targetDir) && fs.statSync(targetDir).isDirectory()) {
    syncDirectoryReadme(targetDir);
  } else {
    console.error(`Invalid directory: ${targetArg}`);
  }
} else {
  console.log('Usage: node sync.mjs <directory_path>');
}
