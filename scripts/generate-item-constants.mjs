import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const itemsJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'data/torn/items.json'), 'utf-8'));
const itemEntries = Object.entries(itemsJson.items);

function toConstantName(name) {
  let s = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toUpperCase();
  if (!s || /^\d/.test(s)) {
    s = '_' + s;
  }
  return s;
}

// Parse items with their types
const items = itemEntries.map(([idStr, item]) => ({
  id: parseInt(idStr, 10),
  name: item.name,
  type: item.type || 'Other'
}));

// Group by type
const grouped = {};
for (const item of items) {
  const type = item.type;
  if (!grouped[type]) grouped[type] = [];
  grouped[type].push(item);
}

// Sort types in a consistent order
const typeOrder = [
  'Melee', 'Primary', 'Secondary', 'Defensive',
  'Candy', 'Material', 'Clothing', 'Other', 'Special',
  'Jewelry', 'Tool', 'Medical', 'Collectible', 'Car'
];

const sortedTypes = Object.keys(grouped).sort((a, b) => {
  const ia = typeOrder.indexOf(a);
  const ib = typeOrder.indexOf(b);
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
});

const MONEY_ITEMS_MIN_ID = 100000;
const usedNames = new Set(['CASH', 'POINTS']);

// Known override names to preserve backward compatibility
const knownOverrides = {
  'Teddy Bear Plushie': 'TEDDY_BEAR_PLUSHIE',
  'Kitten Plushie': 'KITTEN_PLUSHIE',
  'Monkey Plushie': 'MONKEY_PLUSHIE',
  'Dahlia': 'DAHLIA'
};

const lines = [];
lines.push(`const MONEY_ITEMS_MIN_ID = ${MONEY_ITEMS_MIN_ID};`);
lines.push('');
lines.push('export class ItemList {');
lines.push('    // Cash and Points');
lines.push(`    public static readonly CASH = MONEY_ITEMS_MIN_ID + 1;`);
lines.push(`    public static readonly POINTS = MONEY_ITEMS_MIN_ID + 2;`);

for (const type of sortedTypes) {
  const typeItems = grouped[type].sort((a, b) => a.id - b.id);
  lines.push('');
  lines.push(`    // ${type}`);
  for (const item of typeItems) {
    let constName = knownOverrides[item.name] || toConstantName(item.name);

    // Handle collisions
    let finalName = constName;
    let counter = 1;
    while (usedNames.has(finalName)) {
      finalName = `${constName}_${counter++}`;
    }
    usedNames.add(finalName);

    lines.push(`    public static readonly ${finalName} = ${item.id};`);
  }
}

lines.push('}');
lines.push('');

fs.writeFileSync(path.join(rootDir, 'lib/objects/Item.ts'), lines.join('\n'), 'utf-8');
console.log(`Generated Item.ts with ${items.length} items across ${sortedTypes.length} types.`);
