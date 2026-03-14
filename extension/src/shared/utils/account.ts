import type { AuthPlan } from '@/features/auth';
import type { PlanLimits } from '@/shared/types';

export const PLAN_LIMITS: Record<AuthPlan, PlanLimits> = {
  free: {
    maxRules: 10,
    maxCollections: 3,
    maxTeamMembers: 0,
    cloudSync: false,
    versionHistory: false,
    importExport: true,
    storageBytes: 5 * 1024 * 1024,
  },
  pro: {
    maxRules: 100,
    maxCollections: 20,
    maxTeamMembers: 0,
    cloudSync: true,
    versionHistory: true,
    importExport: true,
    storageBytes: 50 * 1024 * 1024,
  },
  team: {
    maxRules: Infinity,
    maxCollections: Infinity,
    maxTeamMembers: 10,
    cloudSync: true,
    versionHistory: true,
    importExport: true,
    storageBytes: 500 * 1024 * 1024,
  },
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
