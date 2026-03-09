import { create } from 'zustand';
import { BILLING_MESSAGES } from './constants';

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
        type: BILLING_MESSAGES.CREATE_CHECKOUT_SESSION,
        data: {
          priceId,
          successUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing?checkout=success`,
          cancelUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing?checkout=canceled`,
        },
      });
      set({ loading: false });
      return response.url;
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
        type: BILLING_MESSAGES.CREATE_CUSTOMER_PORTAL_SESSION,
        data: {
          returnUrl: `chrome-extension://${chrome.runtime.id}/sidepanel.html#/billing`,
        },
      });
      set({ loading: false });
      return response.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Portal session failed';
      set({ loading: false, error: message });
      throw err;
    }
  },
}));
