import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBillingStore } from './billing-store';

// Mock chrome.runtime.sendMessage
const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
  },
});

describe('useBillingStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store state
    useBillingStore.setState({ loading: false, error: null });
  });

  describe('initial state', () => {
    it('has loading=false and error=null', () => {
      const state = useBillingStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe(null);
    });
  });

  describe('createCheckoutSession', () => {
    it('sets loading=true during request', async () => {
      mockSendMessage.mockImplementation(() => new Promise(() => {})); // never resolves
      void useBillingStore.getState().createCheckoutSession('price_123');
      expect(useBillingStore.getState().loading).toBe(true);
      // cleanup - don't await
    });

    it('sends correct message to background', async () => {
      mockSendMessage.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

      await useBillingStore.getState().createCheckoutSession('price_123');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_CHECKOUT_SESSION',
          data: expect.objectContaining({ priceId: 'price_123' }),
        })
      );
    });

    it('returns checkout URL on success', async () => {
      mockSendMessage.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

      const url = await useBillingStore.getState().createCheckoutSession('price_123');

      expect(url).toBe('https://checkout.stripe.com/session');
    });

    it('sets loading=false after success', async () => {
      mockSendMessage.mockResolvedValue({ url: 'https://checkout.stripe.com/session' });

      await useBillingStore.getState().createCheckoutSession('price_123');

      expect(useBillingStore.getState().loading).toBe(false);
    });

    it('sets error on failure', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      await useBillingStore.getState().createCheckoutSession('price_123').catch(() => {});

      expect(useBillingStore.getState().error).toBe('Network error');
      expect(useBillingStore.getState().loading).toBe(false);
    });
  });

  describe('createPortalSession', () => {
    it('sends correct message to background', async () => {
      mockSendMessage.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });

      await useBillingStore.getState().createPortalSession();

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_CUSTOMER_PORTAL_SESSION',
        })
      );
    });

    it('returns portal URL on success', async () => {
      mockSendMessage.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });

      const url = await useBillingStore.getState().createPortalSession();

      expect(url).toBe('https://billing.stripe.com/portal');
    });

    it('sets error on failure', async () => {
      mockSendMessage.mockRejectedValue(new Error('Portal error'));

      await useBillingStore.getState().createPortalSession().catch(() => {});

      expect(useBillingStore.getState().error).toBe('Portal error');
    });
  });
});
