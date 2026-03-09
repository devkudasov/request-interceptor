import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from '@testing-library/react';

vi.stubGlobal('chrome', {
  storage: {
    session: {
      get: vi.fn(() => Promise.resolve({})),
      set: vi.fn(() => Promise.resolve()),
    },
  },
  runtime: {
    sendMessage: vi.fn(),
    lastError: null,
    onMessage: { addListener: vi.fn() },
  },
});

import { useLogPanelStore } from './log-panel-store';

describe('useLogPanelStore', () => {
  beforeEach(() => {
    act(() => {
      useLogPanelStore.setState({
        isOpen: false,
        panelHeight: 250,
        unseenCount: 0,
      });
    });
    vi.clearAllMocks();
  });

  it('isOpen defaults to false', () => {
    expect(useLogPanelStore.getState().isOpen).toBe(false);
  });

  it('togglePanel opens when closed', () => {
    act(() => {
      useLogPanelStore.getState().togglePanel();
    });
    expect(useLogPanelStore.getState().isOpen).toBe(true);
  });

  it('togglePanel closes when open', () => {
    act(() => {
      useLogPanelStore.setState({ isOpen: true });
    });
    act(() => {
      useLogPanelStore.getState().togglePanel();
    });
    expect(useLogPanelStore.getState().isOpen).toBe(false);
  });

  it('panelHeight defaults to 250', () => {
    expect(useLogPanelStore.getState().panelHeight).toBe(250);
  });

  it('setPanelHeight updates height', () => {
    act(() => {
      useLogPanelStore.getState().setPanelHeight(300);
    });
    expect(useLogPanelStore.getState().panelHeight).toBe(300);
  });

  it('setPanelHeight clamps to minimum 150', () => {
    act(() => {
      useLogPanelStore.getState().setPanelHeight(50);
    });
    expect(useLogPanelStore.getState().panelHeight).toBe(150);
  });

  it('setPanelHeight clamps to maximum 500', () => {
    act(() => {
      useLogPanelStore.getState().setPanelHeight(999);
    });
    expect(useLogPanelStore.getState().panelHeight).toBe(500);
  });

  it('unseenCount defaults to 0', () => {
    expect(useLogPanelStore.getState().unseenCount).toBe(0);
  });

  it('incrementUnseen increases count', () => {
    act(() => {
      useLogPanelStore.getState().incrementUnseen();
    });
    expect(useLogPanelStore.getState().unseenCount).toBe(1);

    act(() => {
      useLogPanelStore.getState().incrementUnseen();
    });
    expect(useLogPanelStore.getState().unseenCount).toBe(2);
  });

  it('resetUnseen sets count to 0', () => {
    act(() => {
      useLogPanelStore.setState({ unseenCount: 5 });
    });
    act(() => {
      useLogPanelStore.getState().resetUnseen();
    });
    expect(useLogPanelStore.getState().unseenCount).toBe(0);
  });
});
