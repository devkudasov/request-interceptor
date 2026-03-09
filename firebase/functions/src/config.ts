import * as admin from 'firebase-admin';
import Stripe from 'stripe';

if (!admin.apps.length) {
  admin.initializeApp();
}

export const db = admin.firestore();

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeInstance = new Stripe(secretKey);
  }
  return stripeInstance;
}

export const PRODUCT_TO_PLAN: Record<string, 'pro' | 'team'> = {
  'prod_U7O6buq8fg5tZ5': 'pro',
  'prod_U7O791CNkuR3Ho': 'team',
};
