import type { MockRule } from '@/shared/types';
import { Toggle } from '@/ui/common/Toggle';
import { Badge } from '@/ui/common/Badge';
import { Button } from '@/ui/common/Button';
import { methodColors } from '@/ui/theme/tokens';

interface RuleCardProps {
  rule: MockRule;
  collectionName?: string;
  onToggle: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: Record<string, unknown>;
}

export function RuleCard({
  rule,
  collectionName,
  onToggle,
  onEdit,
  onDelete,
  dragHandleProps,
}: RuleCardProps) {
  return (
    <div
      className={`bg-surface-card border border-border rounded-md p-md transition-opacity ${
        !rule.enabled ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-sm">
        {dragHandleProps && (
          <span className="cursor-grab text-content-muted mt-xs" {...dragHandleProps}>
            &#x2261;
          </span>
        )}

        <Toggle checked={rule.enabled} onChange={() => onToggle(rule.id)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xs flex-wrap">
            <Badge color={methodColors[rule.method] ?? methodColors.GET}>
              {rule.method}
            </Badge>
            <span className="font-mono text-base text-content-primary truncate">
              {rule.urlPattern}
            </span>
          </div>

          <div className="flex items-center gap-sm mt-xs text-sm text-content-secondary">
            <span>{rule.statusCode}</span>
            <span>{rule.responseType.toUpperCase()}</span>
            {rule.delay > 0 && <span>{rule.delay}ms</span>}
            {rule.graphqlOperation && (
              <Badge variant="info">{rule.graphqlOperation}</Badge>
            )}
          </div>

          {collectionName && (
            <span className="text-xs text-content-muted mt-xs inline-block">
              {collectionName}
            </span>
          )}
        </div>

        <div className="flex gap-xs shrink-0">
          <Button variant="ghost" size="sm" onClick={() => onEdit(rule.id)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(rule.id)}>
            Del
          </Button>
        </div>
      </div>
    </div>
  );
}
