import { Toggle } from '@/ui/common/Toggle';
import { RuleCard } from './RuleCard';
import { getChildCollections } from '@/shared/selectors';
import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';

interface CollectionGroupProps {
  collection: Collection;
  rules: MockRule[];
  childCollections: Collection[];
  allCollections: Collection[];
  allRules: MockRule[];
  depth: number;
  collapsed: boolean;
  onToggleCollapsed: (id: string) => void;
  onToggleCollection: (id: string) => void;
  onToggleRule: (id: string) => void;
  onEditRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export function CollectionGroup({
  collection,
  rules,
  childCollections,
  allCollections,
  allRules,
  depth,
  collapsed,
  onToggleCollapsed,
  onToggleCollection,
  onToggleRule,
  onEditRule,
  onDeleteRule,
}: CollectionGroupProps) {
  const marginLeft = depth > 0 ? `${depth * 16}px` : undefined;

  return (
    <div
      className={`border border-border rounded-md ${!collection.enabled ? 'opacity-50' : ''}`}
      style={{ marginLeft }}
    >
      <div className="flex items-center gap-sm px-md py-sm bg-surface-secondary rounded-t-md">
        <button
          onClick={() => onToggleCollapsed(collection.id)}
          aria-label={`Toggle ${collection.name}`}
          className="text-content-secondary hover:text-content-primary text-sm w-5 text-center"
        >
          {collapsed ? '▶' : '▼'}
        </button>

        <Toggle checked={collection.enabled} onChange={() => onToggleCollection(collection.id)} />

        <span className="text-sm font-medium text-content-primary flex-1 truncate">
          {collection.name}
        </span>

        <span className="text-xs text-content-muted bg-surface-tertiary px-xs py-0.5 rounded-full min-w-[20px] text-center">
          {rules.length}
        </span>
      </div>

      {!collapsed && (
        <div className="flex flex-col gap-sm p-sm">
          {childCollections.map((child) => {
            const childRules = allRules.filter((r) => r.collectionId === child.id);
            const grandChildren = getChildCollections(allCollections, child.id);
            return (
              <CollectionGroup
                key={child.id}
                collection={child}
                rules={childRules}
                childCollections={grandChildren}
                allCollections={allCollections}
                allRules={allRules}
                depth={depth + 1}
                collapsed={false}
                onToggleCollapsed={onToggleCollapsed}
                onToggleCollection={onToggleCollection}
                onToggleRule={onToggleRule}
                onEditRule={onEditRule}
                onDeleteRule={onDeleteRule}
              />
            );
          })}

          {rules.length === 0 && childCollections.length === 0 && (
            <p className="text-sm text-content-muted py-sm text-center">No rules</p>
          )}

          {rules.map((rule) => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={onToggleRule}
              onEdit={onEditRule}
              onDelete={onDeleteRule}
            />
          ))}
        </div>
      )}
    </div>
  );
}
