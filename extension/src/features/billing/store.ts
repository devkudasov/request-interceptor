import { create } from 'zustand';
import { MESSAGE_TYPES } from '@/shared/constants';

interface BillingState {
  loading: boolean;
  error: string | null;
  createCheckoutSession: (priceId: string) => Promise<string>;
  createPortalSession: () => Promise<string>;
}

export const useBillingStore = create<BillingState>((set) => ({
  loading: false,
  error: null,

  createCheckoutSession: async (priceId: string) => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.CREATE_CHECKOUT_SESSION,
        payload: {
          priceId,
          successUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing?checkout=success`,
          cancelUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing?checkout=canceled`,
        },
      });
      if (!response.ok) throw new Error(response.error);
      set({ loading: false });
      return response.data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Checkout failed';
      set({ loading: false, error: message });
      throw err;
    }
  },

  createPortalSession: async () => {
    set({ loading: true, error: null });
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.CREATE_CUSTOMER_PORTAL_SESSION,
        payload: {
          returnUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing`,
        },
      });
      if (!response.ok) throw new Error(response.error);
      set({ loading: false });
      return response.data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Portal session failed';
      set({ loading: false, error: message });
      throw err;
    }
  },
}));
