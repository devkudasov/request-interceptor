import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useRulesStore,
  useCollectionsStore,
  useAuthStore,
  useTeamsStore,
  useWorkspaceUIStore,
} from '@/shared/store';
import {
  filterRulesByType,
  countRulesByType,
  buildCollectionTree,
} from '@/shared/selectors';
import { exportCollections, downloadJson, parseImportFile } from '@/shared/import-export';
import { WorkspaceToolbar } from '../components/workspace/WorkspaceToolbar';
import { WorkspaceEmptyState } from '../components/workspace/WorkspaceEmptyState';
import { RequestTypeTabs } from '../components/workspace/RequestTypeTabs';
import { TeamHeader } from '../components/workspace/TeamHeader';
import { TeamPanel } from '../components/workspace/TeamPanel';
import { SyncControls } from '../components/SyncControls';
import { WorkspaceCollections } from './workspace/WorkspaceCollections';
import { WorkspaceUngrouped } from './workspace/WorkspaceUngrouped';
import { NewCollectionModal } from './workspace/NewCollectionModal';

export function WorkspacePage() {
  const navigate = useNavigate();
  const [urlFilter, setUrlFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [teamExpanded, setTeamExpanded] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const { rules, fetchRules, toggleRule, deleteRule } = useRulesStore();
  const { collections, fetchCollections, createCollection, toggleCollection } =
    useCollectionsStore();
  const { user } = useAuthStore();
  const teamStore = useTeamsStore();
  const { activeTypeTab, setActiveTypeTab, collapsedCollections, toggleCollectionCollapsed } =
    useWorkspaceUIStore();

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

  const handleNewRule = useCallback(() => navigate('/rules/new'), [navigate]);
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
        onNewCollection={() => setShowModal(true)}
        onImport={handleImport}
        onExport={handleExport}
        hasCollections={collections.length > 0}
        isRecording={false}
        onRecordClick={() => {}}
        onStopClick={() => {}}
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
          onCreateCollection={() => setShowModal(true)}
          onRecord={() => {}}
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
    </div>
  );
}
