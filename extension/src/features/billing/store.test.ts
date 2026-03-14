import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useBillingStore } from './store';

const mockSendMessage = vi.fn();
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: mockSendMessage,
    lastError: null,
    id: 'test-extension-id',
    onMessage: { addListener: vi.fn() },
  },
  storage: {
    local: { get: vi.fn(), set: vi.fn() },
    session: { get: vi.fn(), set: vi.fn() },
  },
  tabs: { query: vi.fn() },
});

describe('useBillingStore', () => {
  beforeEach(() => {
    useBillingStore.setState(useBillingStore.getInitialState());
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with loading false and error null', () => {
      const state = useBillingStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('createCheckoutSession', () => {
    it('sets loading true during request', async () => {
      mockSendMessage.mockImplementation(() => new Promise(() => {}));
      void useBillingStore.getState().createCheckoutSession('price_123');
      expect(useBillingStore.getState().loading).toBe(true);
    });

    it('sends correct message with priceId and URLs', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://checkout.stripe.com/session' },
      });

      await useBillingStore.getState().createCheckoutSession('price_123');

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_CHECKOUT_SESSION',
          payload: expect.objectContaining({
            priceId: 'price_123',
            successUrl: expect.stringContaining('checkout=success'),
            cancelUrl: expect.stringContaining('checkout=canceled'),
          }),
        }),
      );
    });

    it('returns checkout URL on success', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://checkout.stripe.com/session' },
      });

      const url = await useBillingStore
        .getState()
        .createCheckoutSession('price_123');

      expect(url).toBe('https://checkout.stripe.com/session');
    });

    it('sets loading false after success', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://checkout.stripe.com/session' },
      });

      await useBillingStore.getState().createCheckoutSession('price_123');

      expect(useBillingStore.getState().loading).toBe(false);
    });

    it('sets error and throws when response is not ok', async () => {
      mockSendMessage.mockResolvedValue({
        ok: false,
        error: 'Server error',
      });

      await expect(
        useBillingStore.getState().createCheckoutSession('price_123'),
      ).rejects.toThrow('Server error');

      expect(useBillingStore.getState().error).toBe('Server error');
      expect(useBillingStore.getState().loading).toBe(false);
    });

    it('sets error and throws on rejection', async () => {
      mockSendMessage.mockRejectedValue(new Error('Network error'));

      await expect(
        useBillingStore.getState().createCheckoutSession('price_123'),
      ).rejects.toThrow('Network error');

      expect(useBillingStore.getState().error).toBe('Network error');
      expect(useBillingStore.getState().loading).toBe(false);
    });

    it('handles non-Error rejection with fallback message', async () => {
      mockSendMessage.mockRejectedValue('string-error');

      await expect(
        useBillingStore.getState().createCheckoutSession('price_123'),
      ).rejects.toBe('string-error');

      expect(useBillingStore.getState().error).toBe('Checkout failed');
    });
  });

  describe('createPortalSession', () => {
    it('sends correct message with returnUrl', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://billing.stripe.com/portal' },
      });

      await useBillingStore.getState().createPortalSession();

      expect(mockSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'CREATE_CUSTOMER_PORTAL_SESSION',
          payload: expect.objectContaining({
            returnUrl: expect.stringContaining('sidepanel.html#/billing'),
          }),
        }),
      );
    });

    it('returns portal URL on success', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://billing.stripe.com/portal' },
      });

      const url = await useBillingStore.getState().createPortalSession();

      expect(url).toBe('https://billing.stripe.com/portal');
    });

    it('sets loading false after success', async () => {
      mockSendMessage.mockResolvedValue({
        ok: true,
        data: { url: 'https://billing.stripe.com/portal' },
      });

      await useBillingStore.getState().createPortalSession();

      expect(useBillingStore.getState().loading).toBe(false);
    });

    it('sets error and throws when response is not ok', async () => {
      mockSendMessage.mockResolvedValue({
        ok: false,
        error: 'Portal error',
      });

      await expect(
        useBillingStore.getState().createPortalSession(),
      ).rejects.toThrow('Portal error');

      expect(useBillingStore.getState().error).toBe('Portal error');
    });

    it('sets error and throws on rejection', async () => {
      mockSendMessage.mockRejectedValue(new Error('Portal network error'));

      await expect(
        useBillingStore.getState().createPortalSession(),
      ).rejects.toThrow('Portal network error');

      expect(useBillingStore.getState().error).toBe('Portal network error');
    });

    it('handles non-Error rejection with fallback message', async () => {
      mockSendMessage.mockRejectedValue('string-error');

      await expect(
        useBillingStore.getState().createPortalSession(),
      ).rejects.toBe('string-error');

      expect(useBillingStore.getState().error).toBe('Portal session failed');
    });
  });
});
