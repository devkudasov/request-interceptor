import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStorageUsage } from './useStorageUsage';

// ---------- chrome.storage mock setup ----------

const mockGetBytesInUse = vi.fn();
const mockAddListener = vi.fn();
const mockRemoveListener = vi.fn();

beforeEach(() => {
  mockGetBytesInUse.mockReset();
  mockAddListener.mockReset();
  mockRemoveListener.mockReset();

  vi.stubGlobal('chrome', {
    storage: {
      local: {
        getBytesInUse: mockGetBytesInUse,
      },
      onChanged: {
        addListener: mockAddListener,
        removeListener: mockRemoveListener,
      },
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ---------- tests ----------

describe('useStorageUsage', () => {
  it('returns loading=true initially', () => {
    mockGetBytesInUse.mockImplementation(() => new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useStorageUsage());

    expect(result.current.loading).toBe(true);
    expect(result.current.usedBytes).toBe(0);
  });

  it('calls chrome.storage.local.getBytesInUse(null) on mount', () => {
    mockGetBytesInUse.mockResolvedValue(0);

    renderHook(() => useStorageUsage());

    expect(mockGetBytesInUse).toHaveBeenCalledWith(null);
  });

  it('returns usedBytes and loading=false after getBytesInUse resolves', async () => {
    mockGetBytesInUse.mockResolvedValue(1_048_576);

    const { result } = renderHook(() => useStorageUsage());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.usedBytes).toBe(1_048_576);
  });

  it('registers a chrome.storage.onChanged listener on mount', () => {
    mockGetBytesInUse.mockResolvedValue(0);

    renderHook(() => useStorageUsage());

    expect(mockAddListener).toHaveBeenCalledTimes(1);
    expect(mockAddListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates usedBytes when chrome.storage.onChanged fires', async () => {
    mockGetBytesInUse
      .mockResolvedValueOnce(500_000) // initial call
      .mockResolvedValueOnce(1_200_000); // after change event

    const { result } = renderHook(() => useStorageUsage());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.usedBytes).toBe(500_000);

    // Grab the onChanged listener and fire it
    const onChangedCallback = mockAddListener.mock.calls[0][0];

    await act(async () => {
      onChangedCallback({}, 'local');
    });

    await waitFor(() => {
      expect(result.current.usedBytes).toBe(1_200_000);
    });
  });

  it('removes the onChanged listener on unmount', async () => {
    mockGetBytesInUse.mockResolvedValue(0);

    const { unmount } = renderHook(() => useStorageUsage());

    // The listener that was added should be the same reference removed
    const addedListener = mockAddListener.mock.calls[0][0];

    unmount();

    expect(mockRemoveListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveListener).toHaveBeenCalledWith(addedListener);
  });
});
