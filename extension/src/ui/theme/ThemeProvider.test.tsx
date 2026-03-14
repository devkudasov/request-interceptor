import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider';

// Mock chrome storage
let storageData: Record<string, unknown> = {};
let storageChangeListeners: ((changes: Record<string, unknown>) => void)[] = [];

const mockStorageGet = vi.fn((_key: string, cb: (result: Record<string, unknown>) => void) => {
  cb(storageData);
});
const mockStorageSet = vi.fn((data: Record<string, unknown>) => {
  storageData = { ...storageData, ...data };
});
const mockOnChangedAddListener = vi.fn((handler: (changes: Record<string, unknown>) => void) => {
  storageChangeListeners.push(handler);
});
const mockOnChangedRemoveListener = vi.fn((handler: (changes: Record<string, unknown>) => void) => {
  storageChangeListeners = storageChangeListeners.filter((h) => h !== handler);
});

vi.stubGlobal('chrome', {
  storage: {
    local: {
      get: mockStorageGet,
      set: mockStorageSet,
    },
    onChanged: {
      addListener: mockOnChangedAddListener,
      removeListener: mockOnChangedRemoveListener,
    },
  },
  runtime: {
    id: 'test-extension-id',
    lastError: null,
  },
});

// Track matchMedia state
let darkModePreference = false;
let mediaChangeListeners: (() => void)[] = [];

beforeEach(() => {
  storageData = {};
  storageChangeListeners = [];
  mediaChangeListeners = [];
  darkModePreference = false;
  vi.clearAllMocks();

  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => ({
      matches: query === '(prefers-color-scheme: dark)' ? darkModePreference : false,
      media: query,
      addEventListener: (_event: string, handler: () => void) => {
        mediaChangeListeners.push(handler);
      },
      removeEventListener: (_event: string, handler: () => void) => {
        mediaChangeListeners = mediaChangeListeners.filter((h) => h !== handler);
      },
    })),
  });

  // Reset document class
  document.documentElement.classList.remove('dark');
});

afterEach(() => {
  document.documentElement.classList.remove('dark');
});

// Helper component to consume theme context
function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}

describe('ThemeProvider — default behavior', () => {
  it('defaults to dark theme', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('provides theme context to children', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toBeInTheDocument();
    expect(screen.getByTestId('resolved')).toBeInTheDocument();
  });
});

describe('ThemeProvider — loading from storage', () => {
  it('loads saved theme from chrome.storage', () => {
    storageData = { settings: { theme: 'light' } };

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(mockStorageGet).toHaveBeenCalledWith('settings', expect.any(Function));
    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });

  it('applies dark class when saved theme is dark', () => {
    storageData = { settings: { theme: 'dark' } };

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes dark class when saved theme is light', () => {
    document.documentElement.classList.add('dark');
    storageData = { settings: { theme: 'light' } };

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('ThemeProvider — switching themes', () => {
  it('switches to light theme', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Light'));

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('switches to dark theme', async () => {
    const user = userEvent.setup();
    storageData = { settings: { theme: 'light' } };

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Dark'));

    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists theme to chrome.storage when changed', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('Light'));

    // First, it reads existing settings, then sets
    expect(mockStorageGet).toHaveBeenCalledWith('settings', expect.any(Function));
    expect(mockStorageSet).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ theme: 'light' }),
      }),
    );
  });
});

describe('ThemeProvider — system theme', () => {
  it('resolves system theme to dark when OS prefers dark', async () => {
    const user = userEvent.setup();
    darkModePreference = true;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('System'));

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
  });

  it('resolves system theme to light when OS prefers light', async () => {
    const user = userEvent.setup();
    darkModePreference = false;

    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    await user.click(screen.getByText('System'));

    expect(screen.getByTestId('theme').textContent).toBe('system');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });
});

describe('ThemeProvider — storage sync', () => {
  it('updates theme when storage changes externally', () => {
    render(
      <ThemeProvider>
        <ThemeConsumer />
      </ThemeProvider>,
    );

    expect(mockOnChangedAddListener).toHaveBeenCalled();

    // Simulate external storage change
    act(() => {
      for (const listener of storageChangeListeners) {
        listener({
          settings: {
            newValue: { theme: 'light' },
          },
        });
      }
    });

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('resolved').textContent).toBe('light');
  });
});

describe('useTheme — error handling', () => {
  it('throws when used outside ThemeProvider', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used within ThemeProvider',
    );

    consoleSpy.mockRestore();
  });
});
