import type { AuthPlan } from '@/shared/types';

export const PLAN_QUOTAS: Record<AuthPlan, number> = {
  free: 5 * 1024 * 1024, // 5 MB
  pro: 50 * 1024 * 1024, // 50 MB
  team: 500 * 1024 * 1024, // 500 MB
};

export const PLAN_BADGE_VARIANT: Record<AuthPlan, 'default' | 'success' | 'info'> = {
  free: 'default',
  pro: 'success',
  team: 'info',
};

export function getInitials(name: string | null, email: string | null): string {
  if (name) {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return '?';
}
