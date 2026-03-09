/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mocks must be defined before imports ---

const mockHttpsError = class HttpsError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'HttpsError';
  }
};

jest.mock('firebase-functions/v2/https', () => ({
  onCall: jest.fn((handler: any) => handler),
  HttpsError: mockHttpsError,
}));

const mockDb = {
  collection: jest.fn(),
};
const mockGetStripe = jest.fn();

jest.mock('../config', () => ({
  db: mockDb,
  getStripe: mockGetStripe,
}));

const mockGetOrCreateCustomer = jest.fn();

jest.mock('./helpers', () => ({
  getOrCreateCustomer: mockGetOrCreateCustomer,
}));

// --- Import the function under test ---
import { createCheckoutSession } from './checkout';

describe('createCheckoutSession', () => {
  const mockStripe = {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStripe.mockReturnValue(mockStripe);
  });

  it('should return error if not authenticated', async () => {
    const request = {
      data: { priceId: 'price_123', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' },
      auth: undefined,
    };

    await expect(createCheckoutSession(request as any)).rejects.toThrow();
    await expect(createCheckoutSession(request as any)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('should return error if priceId is missing', async () => {
    const request = {
      data: { successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    await expect(createCheckoutSession(request as any)).rejects.toThrow();
    await expect(createCheckoutSession(request as any)).rejects.toMatchObject({
      code: 'invalid-argument',
    });
  });

  it('should return error if user already has active subscription', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'pro',
        subscriptionStatus: 'active',
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    const request = {
      data: { priceId: 'price_123', successUrl: 'https://example.com/success', cancelUrl: 'https://example.com/cancel' },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    await expect(createCheckoutSession(request as any)).rejects.toThrow();
    await expect(createCheckoutSession(request as any)).rejects.toMatchObject({
      code: 'already-exists',
    });
  });

  it('should create checkout session with correct params', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'free',
        subscriptionStatus: null,
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    mockGetOrCreateCustomer.mockResolvedValue('cus_test123');

    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_session',
      url: 'https://checkout.stripe.com/session/cs_test_session',
    });

    const request = {
      data: {
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    await createCheckoutSession(request as any);

    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test123',
        mode: 'subscription',
        line_items: [{ price: 'price_123', quantity: 1 }],
        metadata: expect.objectContaining({ firebaseUID: 'user-123' }),
      })
    );
  });

  it('should return sessionId and url on success', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'free',
        subscriptionStatus: null,
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    mockGetOrCreateCustomer.mockResolvedValue('cus_test123');

    mockStripe.checkout.sessions.create.mockResolvedValue({
      id: 'cs_test_session',
      url: 'https://checkout.stripe.com/session/cs_test_session',
    });

    const request = {
      data: {
        priceId: 'price_123',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    const result = await createCheckoutSession(request as any);

    expect(result).toEqual({
      sessionId: 'cs_test_session',
      url: 'https://checkout.stripe.com/session/cs_test_session',
    });
  });
});
