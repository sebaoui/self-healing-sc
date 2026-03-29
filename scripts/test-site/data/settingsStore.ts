import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export type TitleSelector = 'h2' | 'h3';

// Use path relative to the file itself to avoid process.cwd() uncertainty.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.join(__dirname, 'settings.json');

export const getTitleSelector = (): TitleSelector => {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
      console.log(`[STORE] Read setting from ${SETTINGS_FILE}: ${data.titleSelector}`);
      return data.titleSelector || 'h2';
    }
  } catch (err) {
    console.error('[STORE] Error reading settings file:', err);
  }
  return 'h2';
};

export const setTitleSelector = (selector: TitleSelector) => {
  try {
    const data = { titleSelector: selector };
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`[STORE] Successfully updated ${SETTINGS_FILE} to: ${selector}`);
  } catch (err) {
    console.error('[STORE] Error writing settings file:', err);
  }
};
