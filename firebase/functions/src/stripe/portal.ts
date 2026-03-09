import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { db, getStripe } from '../config';

export const createCustomerPortalSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const uid = request.auth.uid;
  const { returnUrl } = request.data;

  const userDoc = await db.collection('users').doc(uid).get();
  const userData = userDoc.data();

  if (!userData?.stripeCustomerId) {
    throw new HttpsError('failed-precondition', 'No Stripe customer found for this user');
  }

  const stripe = getStripe();
  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
});
