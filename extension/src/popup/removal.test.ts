import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'fs';
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
    // Check all files in the background directory for the specific API call.
    const backgroundDir = resolve(__dirname, '../background');
    const files = readdirSync(backgroundDir) as string[];
    const allBackgroundCode = files
      .filter((f: string) => f.endsWith('.ts') || f.endsWith('.js'))
      .map((f: string) => readFileSync(resolve(backgroundDir, f), 'utf-8'))
      .join('\n');

    expect(allBackgroundCode).toContain('setPanelBehavior');
    expect(allBackgroundCode).toContain('openPanelOnActionClick');
  });
});
