import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialData } from './initialData.js';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), 'database.json');
fs.writeFileSync(file, JSON.stringify(createInitialData(), null, 2));
console.log('Demo data restored.');
