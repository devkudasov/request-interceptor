/* eslint-disable @typescript-eslint/no-explicit-any */

// --- Mocks must be defined before imports ---

jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn((handler: any) => handler),
  HttpsError: class HttpsError extends Error {
    constructor(public code: string, message: string) {
      super(message);
    }
  },
}));

const mockDb = {
  collection: jest.fn(),
};
const mockGetStripe = jest.fn();

jest.mock('../config', () => ({
  db: mockDb,
  getStripe: mockGetStripe,
  PRODUCT_TO_PLAN: {
    'prod_U7O6buq8fg5tZ5': 'pro',
    'prod_U7O791CNkuR3Ho': 'team',
  },
}));

jest.mock('./helpers', () => ({
  mapProductToPlan: jest.fn((productId: string) => {
    const map: Record<string, string> = {
      'prod_U7O6buq8fg5tZ5': 'pro',
      'prod_U7O791CNkuR3Ho': 'team',
    };
    return map[productId] ?? null;
  }),
}));

import { stripeWebhook } from './webhook';

describe('stripeWebhook', () => {
  const mockStripe = {
    webhooks: {
      constructEvent: jest.fn(),
    },
  };

  let mockRes: any;

  const createMockReq = (body: any, signature = 'sig_test') => ({
    rawBody: Buffer.from(JSON.stringify(body)),
    headers: { 'stripe-signature': signature },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStripe.mockReturnValue(mockStripe);
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('should return 400 if signature verification fails', async () => {
    mockStripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Signature verification failed');
    });

    const req = createMockReq({});
    await stripeWebhook(req as any, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });

  it('should handle checkout.session.completed — update user plan and create billing record', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer: 'cus_test',
          subscription: 'sub_test',
          metadata: { firebaseUID: 'user-123' },
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockSet = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({
      update: mockUpdate,
      set: mockSet,
    });
    mockDb.collection.mockReturnValue({ doc: mockDoc });

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockDb.collection).toHaveBeenCalledWith('users');
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle customer.subscription.updated — update subscription fields', async () => {
    const mockEvent = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_test',
          status: 'active',
          current_period_end: 1700000000,
          items: {
            data: [{ price: { product: 'prod_U7O6buq8fg5tZ5' } }],
          },
          metadata: { firebaseUID: 'user-123' },
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    mockDb.collection.mockReturnValue({ doc: mockDoc });

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle customer.subscription.deleted — reset plan to free', async () => {
    const mockEvent = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_test',
          metadata: { firebaseUID: 'user-123' },
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });
    mockDb.collection.mockReturnValue({ doc: mockDoc });

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        plan: 'free',
      })
    );
    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should handle invoice.payment_failed — set status to past_due', async () => {
    const mockEvent = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'in_test',
          subscription: 'sub_test',
          customer: 'cus_test',
          metadata: { firebaseUID: 'user-123' },
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const mockUpdate = jest.fn().mockResolvedValue(undefined);
    const mockDoc = jest.fn().mockReturnValue({ update: mockUpdate });

    // For invoice.payment_failed, we may need to look up user by customer ID
    const mockWhere = jest.fn().mockReturnValue({
      get: jest.fn().mockResolvedValue({
        empty: false,
        docs: [{ id: 'user-123', ref: { update: mockUpdate } }],
      }),
    });
    mockDb.collection.mockReturnValue({ doc: mockDoc, where: mockWhere });

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should return 200 for unhandled event types', async () => {
    const mockEvent = {
      type: 'some.unhandled.event',
      data: { object: {} },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
  });

  it('should return 400 if firebaseUID metadata is missing on checkout.session.completed', async () => {
    const mockEvent = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          customer: 'cus_test',
          subscription: 'sub_test',
          metadata: {},
        },
      },
    };

    mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

    const req = createMockReq(mockEvent);
    await stripeWebhook(req as any, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
  });
});
