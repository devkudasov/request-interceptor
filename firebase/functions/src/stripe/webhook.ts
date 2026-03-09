import { onRequest } from 'firebase-functions/v2/https';
import { db, getStripe } from '../config';
import { mapProductToPlan } from './helpers';

export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  const secret = process.env.STRIPE_WEBHOOK_SECRET!;
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, secret);
  } catch {
    res.status(400).send('Webhook signature verification failed');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const uid = session.metadata?.firebaseUID;
        if (!uid) {
          res.status(400).send('Missing firebaseUID in metadata');
          return;
        }

        await db.collection('users').doc(uid).update({
          plan: 'pro',
          subscriptionId: session.subscription,
          subscriptionStatus: 'active',
        });

        await db.collection('billing').doc(uid).set({
          stripeCustomerId: session.customer,
          subscriptionId: session.subscription,
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const uid = subscription.metadata?.firebaseUID;
        if (!uid) break;

        const productId = subscription.items?.data?.[0]?.price?.product;
        const plan = mapProductToPlan(productId as string) || 'free';

        await db.collection('users').doc(uid).update({
          plan,
          subscriptionStatus: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const uid = subscription.metadata?.firebaseUID;
        if (!uid) break;

        await db.collection('users').doc(uid).update({
          plan: 'free',
          subscriptionId: null,
          subscriptionStatus: null,
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
        });
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const uid = invoice.metadata?.firebaseUID;
        if (uid) {
          await db.collection('users').doc(uid).update({
            subscriptionStatus: 'past_due',
          });
        }
        break;
      }
    }

    res.status(200).send('ok');
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).send('Webhook handler error');
  }
});
