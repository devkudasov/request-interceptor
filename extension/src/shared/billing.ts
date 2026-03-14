import type { AuthPlan } from '@/features/auth';
import { PLAN_LIMITS } from '@/shared/utils/account';

export function canCreateRule(plan: AuthPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxRules;
}

export function canCreateCollection(plan: AuthPlan, currentCount: number): boolean {
  return currentCount < PLAN_LIMITS[plan].maxCollections;
}

export function canInviteTeamMember(plan: AuthPlan, currentCount: number): boolean {
  const limit = PLAN_LIMITS[plan].maxTeamMembers;
  if (limit === 0) return false;
  return currentCount < limit;
}

export function canUseCloudSync(plan: AuthPlan): boolean {
  return PLAN_LIMITS[plan].cloudSync;
}

export function canUseVersionHistory(plan: AuthPlan): boolean {
  return PLAN_LIMITS[plan].versionHistory;
}

export function getQuotaMessage(resource: 'rules' | 'collections' | 'teamMembers', plan: AuthPlan): string {
  const limits = PLAN_LIMITS[plan];
  switch (resource) {
    case 'rules':
      return `You've reached the limit of ${limits.maxRules} rules on the ${plan} plan.`;
    case 'collections':
      return `You've reached the limit of ${limits.maxCollections} collections on the ${plan} plan.`;
    case 'teamMembers':
      return `You've reached the limit of ${limits.maxTeamMembers} team members on the ${plan} plan.`;
  }
}
