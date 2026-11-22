import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialData } from './initialData.js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const databasePath = path.join(directory, 'database.json');
let data;

function load() {
  if (!data) {
    if (!fs.existsSync(databasePath)) fs.writeFileSync(databasePath, JSON.stringify(createInitialData(), null, 2));
    data = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
    data.alerts ??= [];
    data.notifications ??= [];
  }
  return data;
}

export const store = {
  get: () => load(),
  save: () => fs.writeFileSync(databasePath, JSON.stringify(load(), null, 2)),
  replace: (nextData) => { data = nextData; },
};
