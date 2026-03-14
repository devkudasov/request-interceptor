export type AuthPlan = 'free' | 'pro' | 'team';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  plan: AuthPlan;
  subscriptionStatus?: SubscriptionStatus | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
}
