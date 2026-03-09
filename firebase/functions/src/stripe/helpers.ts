import { db, getStripe } from '../config';

export async function getOrCreateCustomer(uid: string, email: string): Promise<string> {
  const userDoc = await db.collection('users').doc(uid).get();
  const data = userDoc.data();

  if (data?.stripeCustomerId) {
    return data.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    email,
    metadata: { firebaseUID: uid },
  });

  await db.collection('users').doc(uid).update({
    stripeCustomerId: customer.id,
  });

  return customer.id;
}

export function mapProductToPlan(productId: string): 'pro' | 'team' | null {
  const map: Record<string, 'pro' | 'team'> = {
    'prod_U7O6buq8fg5tZ5': 'pro',
    'prod_U7O791CNkuR3Ho': 'team',
  };
  return map[productId] ?? null;
}
