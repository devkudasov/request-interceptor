import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const MANIFEST_PATH = resolve(__dirname, '../../public/manifest.json');

describe('Popup removal — manifest.json', () => {
  it('manifest.json action does NOT have default_popup field', () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'));

    expect(manifest.action).toBeDefined();
    expect(manifest.action).not.toHaveProperty('default_popup');
  });
});

describe('Popup removal — popup HTML file', () => {
  it('popup.html does not exist in src/popup/', () => {
    const popupHtmlPath = resolve(__dirname, 'popup.html');
    expect(existsSync(popupHtmlPath)).toBe(false);
  });
});

describe('Popup removal — side panel opens on action click', () => {
  it('background script calls chrome.sidePanel.setPanelBehavior with openPanelOnActionClick: true', () => {
    // Read the background entry point and its imports to verify the call exists
    const backgroundPath = resolve(__dirname, '../background/index.ts');
    const backgroundSource = readFileSync(backgroundPath, 'utf-8');

    // The call could be in index.ts or in one of its imported modules.
    // We check all files in the background directory for the specific API call.
    const backgroundDir = resolve(__dirname, '../background');
    const fs = require('fs');
    const files = fs.readdirSync(backgroundDir) as string[];
    const allBackgroundCode = files
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .map((f: string) => readFileSync(resolve(backgroundDir, f), 'utf-8'))
      .join('\n');

    expect(allBackgroundCode).toContain('setPanelBehavior');
    expect(allBackgroundCode).toContain('openPanelOnActionClick');
  });
});
