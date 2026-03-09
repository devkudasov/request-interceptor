import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, getStripe } from '../config';
import { getOrCreateCustomer } from './helpers';

export const createCheckoutSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { priceId, successUrl, cancelUrl } = request.data;
  if (!priceId) {
    throw new HttpsError('invalid-argument', 'priceId is required');
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || '';

  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();
  if (userData?.subscriptionStatus === 'active') {
    throw new HttpsError('already-exists', 'User already has an active subscription');
  }

  const customerId = await getOrCreateCustomer(uid, email);

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { firebaseUID: uid },
    subscription_data: { metadata: { firebaseUID: uid } },
  });

  return { sessionId: session.id, url: session.url };
});
