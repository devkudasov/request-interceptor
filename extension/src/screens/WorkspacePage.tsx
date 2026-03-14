import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRulesStore } from '@/features/rules';
import { useCollectionsStore } from '@/features/collections';
import { useAuthStore } from '@/features/auth';
import { useTeamsStore } from '@/features/teams';
import { useWorkspaceUIStore } from '@/features/workspace-ui';
import { useRecordingStore } from '@/features/recording';
import { useTabsStore } from '@/shared/stores';
import {
  filterRulesByType,
  countRulesByType,
  buildCollectionTree,
} from '@/shared/selectors';
import { exportCollections, downloadJson, parseImportFile } from '@/shared/import-export';
import { canCreateRule, canCreateCollection, getQuotaMessage } from '@/shared/billing';
import { WorkspaceToolbar } from '@/features/workspace-ui/widgets/WorkspaceToolbar';
import { UpgradePrompt } from '@/features/billing/widgets/UpgradePrompt';
import { WorkspaceEmptyState } from '@/features/workspace-ui/widgets/WorkspaceEmptyState';
import { RequestTypeTabs } from '@/features/workspace-ui/widgets/RequestTypeTabs';
import { TeamHeader } from '@/features/teams/widgets/TeamHeader';
import { TeamPanel } from '@/features/teams/widgets/TeamPanel';
import { SyncControls } from '@/features/sync/widgets/SyncControls';
import { RecordPopover } from '@/features/recording/widgets/RecordPopover';
import { WorkspaceCollections } from '@/features/collections/widgets/WorkspaceCollections';
import { WorkspaceUngrouped } from '@/features/collections/widgets/WorkspaceUngrouped';
import { NewCollectionModal } from '@/features/collections/widgets/NewCollectionModal';

export function WorkspacePage() {
  const navigate = useNavigate();
  const [urlFilter, setUrlFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  const [showRecordPopover, setShowRecordPopover] = useState(false);

  const { rules, fetchRules, toggleRule, deleteRule } = useRulesStore();
  const { collections, fetchCollections, createCollection, toggleCollection } =
    useCollectionsStore();
  const { user } = useAuthStore();
  const teamStore = useTeamsStore();
  const { activeTypeTab, setActiveTypeTab, collapsedCollections, toggleCollectionCollapsed } =
    useWorkspaceUIStore();
  const { isRecording, startRecording, stopRecording } = useRecordingStore();
  const { tabs, fetchTabs } = useTabsStore();

  useEffect(() => {
    fetchRules();
    fetchCollections();
  }, [fetchRules, fetchCollections]);

  const typedRules = filterRulesByType(rules, activeTypeTab);
  const counts = countRulesByType(rules);

  const filtered = typedRules.filter((r) => {
    if (urlFilter && !r.urlPattern.toLowerCase().includes(urlFilter.toLowerCase())) return false;
    if (methodFilter !== 'ALL' && r.method !== methodFilter) return false;
    return true;
  });

  const rootCollections = buildCollectionTree(collections);
  const ungrouped = filtered.filter((r) => r.collectionId === null);
  const hasContent = rules.length > 0 || collections.length > 0;
  const showTeam = Boolean(user && teamStore.team);

  const handleNewRule = useCallback(() => {
    if (user && !canCreateRule(user.plan, rules.length)) {
      setUpgradeMessage(getQuotaMessage('rules', user.plan));
      return;
    }
    navigate('/rules/new');
  }, [navigate, user, rules.length]);

  const handleNewCollection = useCallback(() => {
    if (user && !canCreateCollection(user.plan, collections.length)) {
      setUpgradeMessage(getQuotaMessage('collections', user.plan));
      return;
    }
    setShowModal(true);
  }, [user, collections.length]);

  const handleEditRule = useCallback((id: string) => navigate(`/rules/${id}/edit`), [navigate]);

  const handleExport = useCallback(() => {
    const data = exportCollections(collections, rules);
    downloadJson(data, 'collections-export.json');
  }, [collections, rules]);

  const handleImport = useCallback(() => importRef.current?.click(), []);

  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => parseImportFile(reader.result as string, collections);
      reader.readAsText(file);
      e.target.value = '';
    },
    [collections],
  );

  const visibleCollections = rootCollections.filter(
    (col) => filtered.some((r) => r.collectionId === col.id),
  );

  return (
    <div className="flex flex-col gap-md">
      {showTeam && (
        <>
          <TeamHeader
            teamName={teamStore.team!.name}
            memberCount={teamStore.team!.members.length}
            expanded={teamExpanded}
            onToggle={() => setTeamExpanded((v) => !v)}
          />
          {teamExpanded && (
            <TeamPanel
              teamId={teamStore.team!.id}
              members={teamStore.team!.members}
              pendingInvites={teamStore.pendingInvites}
              currentUserId={user!.uid}
              canManage={true}
              error={teamStore.error}
              onInvite={teamStore.inviteMember}
              onRemoveMember={teamStore.removeMember}
              onAcceptInvite={teamStore.acceptInvite}
              onDeclineInvite={teamStore.declineInvite}
            />
          )}
        </>
      )}

      <WorkspaceToolbar
        urlFilter={urlFilter}
        onUrlFilterChange={(e) => setUrlFilter(e.target.value)}
        methodFilter={methodFilter}
        onMethodFilterChange={setMethodFilter}
        onNewRule={handleNewRule}
        onNewCollection={handleNewCollection}
        onImport={handleImport}
        onExport={handleExport}
        hasCollections={collections.length > 0}
        isRecording={isRecording}
        onRecordClick={() => {
          fetchTabs();
          setShowRecordPopover(true);
        }}
        onStopClick={async () => {
          await stopRecording();
        }}
      />

      <input
        ref={importRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFile}
      />

      <SyncControls />

      <RequestTypeTabs active={activeTypeTab} onChange={setActiveTypeTab} counts={counts} />

      {!hasContent ? (
        <WorkspaceEmptyState
          onCreateRule={handleNewRule}
          onCreateCollection={handleNewCollection}
          onRecord={() => {
            fetchTabs();
            setShowRecordPopover(true);
          }}
        />
      ) : (
        <>
          <WorkspaceCollections
            collections={visibleCollections}
            allCollections={collections}
            filtered={filtered}
            collapsedCollections={collapsedCollections}
            onToggleCollapsed={toggleCollectionCollapsed}
            onToggleCollection={toggleCollection}
            onToggleRule={toggleRule}
            onEditRule={handleEditRule}
            onDeleteRule={deleteRule}
          />
          <WorkspaceUngrouped
            rules={ungrouped}
            onToggleRule={toggleRule}
            onEditRule={handleEditRule}
            onDeleteRule={deleteRule}
          />
        </>
      )}

      {showModal && (
        <NewCollectionModal
          onClose={() => setShowModal(false)}
          onCreate={createCollection}
        />
      )}

      {upgradeMessage && (
        <UpgradePrompt
          message={upgradeMessage}
          onUpgrade={() => {
            setUpgradeMessage(null);
            navigate('/billing');
          }}
          onClose={() => setUpgradeMessage(null)}
        />
      )}

      {showRecordPopover && (
        <RecordPopover
          tabs={tabs}
          onStartRecording={async (tabId) => {
            await startRecording(tabId);
            setShowRecordPopover(false);
          }}
          onClose={() => setShowRecordPopover(false)}
        />
      )}
    </div>
  );
}
