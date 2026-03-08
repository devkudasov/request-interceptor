import { describe, it, expect } from 'vitest';
import { categorizeSize, colors, methodColors } from './tokens';

describe('categorizeSize', () => {
  it('returns excellent for < 10KB', () => {
    expect(categorizeSize(0)).toBe('excellent');
    expect(categorizeSize(5000)).toBe('excellent');
    expect(categorizeSize(10 * 1024 - 1)).toBe('excellent');
  });

  it('returns good for < 100KB', () => {
    expect(categorizeSize(10 * 1024)).toBe('good');
    expect(categorizeSize(50 * 1024)).toBe('good');
  });

  it('returns acceptable for < 1MB', () => {
    expect(categorizeSize(100 * 1024)).toBe('acceptable');
    expect(categorizeSize(500 * 1024)).toBe('acceptable');
  });

  it('returns poor for >= 1MB', () => {
    expect(categorizeSize(1024 * 1024)).toBe('poor');
    expect(categorizeSize(5 * 1024 * 1024)).toBe('poor');
  });
});

describe('colors', () => {
  it('has light and dark themes', () => {
    expect(colors.light.bgPrimary).toBe('#FFFFFF');
    expect(colors.dark.bgPrimary).toBe('#1E1E2E');
  });
});

describe('methodColors', () => {
  it('has colors for common HTTP methods', () => {
    expect(methodColors.GET).toBeDefined();
    expect(methodColors.POST).toBeDefined();
    expect(methodColors.DELETE).toBeDefined();
  });
});
