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

import { createCustomerPortalSession } from './portal';

describe('createCustomerPortalSession', () => {
  const mockStripe = {
    billingPortal: {
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
      data: { returnUrl: 'https://example.com' },
      auth: undefined,
    };

    await expect(createCustomerPortalSession(request as any)).rejects.toThrow();
    await expect(createCustomerPortalSession(request as any)).rejects.toMatchObject({
      code: 'unauthenticated',
    });
  });

  it('should return error if user has no stripeCustomerId', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        plan: 'free',
        stripeCustomerId: null,
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    const request = {
      data: { returnUrl: 'https://example.com' },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    await expect(createCustomerPortalSession(request as any)).rejects.toThrow();
    await expect(createCustomerPortalSession(request as any)).rejects.toMatchObject({
      code: 'failed-precondition',
    });
  });

  it('should create portal session with correct customer and return_url', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        stripeCustomerId: 'cus_test123',
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/session/portal_test',
    });

    const request = {
      data: { returnUrl: 'https://example.com/settings' },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    await createCustomerPortalSession(request as any);

    expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_test123',
        return_url: 'https://example.com/settings',
      })
    );
  });

  it('should return portal URL on success', async () => {
    const mockDocGet = jest.fn().mockResolvedValue({
      exists: true,
      data: () => ({
        stripeCustomerId: 'cus_test123',
      }),
    });
    mockDb.collection.mockReturnValue({
      doc: jest.fn().mockReturnValue({
        get: mockDocGet,
      }),
    });

    mockStripe.billingPortal.sessions.create.mockResolvedValue({
      url: 'https://billing.stripe.com/session/portal_test',
    });

    const request = {
      data: { returnUrl: 'https://example.com/settings' },
      auth: { uid: 'user-123', token: { email: 'test@example.com' } },
    };

    const result = await createCustomerPortalSession(request as any);

    expect(result).toEqual({
      url: 'https://billing.stripe.com/session/portal_test',
    });
  });
});
