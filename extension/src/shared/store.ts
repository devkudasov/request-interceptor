// Re-exports for backwards compatibility during migration
// New code should import directly from feature modules

export { useRulesStore } from '@/features/rules';
export { useCollectionsStore } from '@/features/collections';
export { useAuthStore } from '@/features/auth';
export { useLogStore } from '@/features/logging';
export { useRecordingStore } from '@/features/recording';
export { useTeamsStore } from '@/features/teams';
export { useSyncStore } from '@/features/sync';
export { useVersionStore } from '@/features/versions';
export { useWorkspaceUIStore } from '@/features/workspace-ui';
export { useSettingsStore, useTabsStore } from '@/shared/stores';
