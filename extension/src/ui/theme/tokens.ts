export const colors = {
  light: {
    bgPrimary: '#FFFFFF',
    bgSecondary: '#F5F5F5',
    bgCard: '#FFFFFF',
    textPrimary: '#1A1A2E',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    border: '#E5E7EB',
    accent: '#6366F1',
    accentHover: '#4F46E5',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  dark: {
    bgPrimary: '#1E1E2E',
    bgSecondary: '#2A2A3C',
    bgCard: '#313145',
    textPrimary: '#E4E4EF',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    border: '#3F3F5C',
    accent: '#818CF8',
    accentHover: '#6366F1',
    success: '#34D399',
    warning: '#FBBF24',
    error: '#F87171',
    info: '#60A5FA',
  },
} as const;

export const methodColors: Record<string, string> = {
  GET: '#10B981',
  POST: '#3B82F6',
  PUT: '#F59E0B',
  DELETE: '#EF4444',
  PATCH: '#8B5CF6',
  HEAD: '#6B7280',
  OPTIONS: '#6B7280',
};

export type SizeCategory = 'excellent' | 'good' | 'acceptable' | 'poor';

export function categorizeSize(bytes: number): SizeCategory {
  if (bytes < 10 * 1024) return 'excellent';
  if (bytes < 100 * 1024) return 'good';
  if (bytes < 1024 * 1024) return 'acceptable';
  return 'poor';
}

export const sizeLabels: Record<SizeCategory, string> = {
  excellent: '< 10KB',
  good: '< 100KB',
  acceptable: '< 1MB',
  poor: '>= 1MB',
};
