import { describe, it, expect } from 'vitest';
import { canCreateRule, canCreateCollection, canInviteTeamMember, canUseCloudSync, canUseVersionHistory, getQuotaMessage } from './billing';

describe('canCreateRule', () => {
  it('returns true when under limit', () => {
    expect(canCreateRule('free', 5)).toBe(true);
  });
  it('returns false when at limit', () => {
    expect(canCreateRule('free', 10)).toBe(false);
  });
  it('returns false when over limit', () => {
    expect(canCreateRule('free', 15)).toBe(false);
  });
  it('returns true for team plan (unlimited)', () => {
    expect(canCreateRule('team', 9999)).toBe(true);
  });
  it('returns true for pro under limit', () => {
    expect(canCreateRule('pro', 50)).toBe(true);
  });
  it('returns false for pro at limit', () => {
    expect(canCreateRule('pro', 100)).toBe(false);
  });
});

describe('canCreateCollection', () => {
  it('returns true when under limit', () => {
    expect(canCreateCollection('free', 2)).toBe(true);
  });
  it('returns false when at limit', () => {
    expect(canCreateCollection('free', 3)).toBe(false);
  });
  it('returns true for team plan (unlimited)', () => {
    expect(canCreateCollection('team', 9999)).toBe(true);
  });
});

describe('canInviteTeamMember', () => {
  it('returns false for free plan', () => {
    expect(canInviteTeamMember('free', 0)).toBe(false);
  });
  it('returns false for pro plan', () => {
    expect(canInviteTeamMember('pro', 0)).toBe(false);
  });
  it('returns true for team plan under limit', () => {
    expect(canInviteTeamMember('team', 5)).toBe(true);
  });
  it('returns false for team plan at limit', () => {
    expect(canInviteTeamMember('team', 10)).toBe(false);
  });
});

describe('canUseCloudSync', () => {
  it('returns false for free plan', () => {
    expect(canUseCloudSync('free')).toBe(false);
  });
  it('returns true for pro plan', () => {
    expect(canUseCloudSync('pro')).toBe(true);
  });
  it('returns true for team plan', () => {
    expect(canUseCloudSync('team')).toBe(true);
  });
});

describe('canUseVersionHistory', () => {
  it('returns false for free plan', () => {
    expect(canUseVersionHistory('free')).toBe(false);
  });
  it('returns true for pro plan', () => {
    expect(canUseVersionHistory('pro')).toBe(true);
  });
});

describe('getQuotaMessage', () => {
  it('returns message for rules limit', () => {
    const msg = getQuotaMessage('rules', 'free');
    expect(msg).toContain('10');
    expect(msg).toMatch(/rules/i);
  });
  it('returns message for collections limit', () => {
    const msg = getQuotaMessage('collections', 'free');
    expect(msg).toContain('3');
    expect(msg).toMatch(/collections/i);
  });
  it('returns message for team members limit', () => {
    const msg = getQuotaMessage('teamMembers', 'team');
    expect(msg).toContain('10');
  });
});
