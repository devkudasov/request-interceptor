import { CollectionGroup } from './CollectionGroup';
import { getChildCollections } from '@/shared/selectors';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';

interface WorkspaceCollectionsProps {
  collections: Collection[];
  allCollections: Collection[];
  filtered: MockRule[];
  collapsedCollections: Set<string>;
  onToggleCollapsed: (id: string) => void;
  onToggleCollection: (id: string) => void;
  onToggleRule: (id: string) => void;
  onEditRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export function WorkspaceCollections({
  collections,
  allCollections,
  filtered,
  collapsedCollections,
  onToggleCollapsed,
  onToggleCollection,
  onToggleRule,
  onEditRule,
  onDeleteRule,
}: WorkspaceCollectionsProps) {
  return (
    <>
      {collections.map((col) => {
        const colRules = filtered.filter((r) => r.collectionId === col.id);
        const children = getChildCollections(allCollections, col.id);
        return (
          <CollectionGroup
            key={col.id}
            collection={col}
            rules={colRules}
            childCollections={children}
            allCollections={allCollections}
            allRules={filtered}
            depth={0}
            collapsed={collapsedCollections.has(col.id)}
            onToggleCollapsed={onToggleCollapsed}
            onToggleCollection={onToggleCollection}
            onToggleRule={onToggleRule}
            onEditRule={onEditRule}
            onDeleteRule={onDeleteRule}
          />
        );
      })}
    </>
  );
}
