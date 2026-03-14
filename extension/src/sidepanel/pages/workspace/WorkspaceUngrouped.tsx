import { RuleCard } from '../../components/RuleCard';
import type { MockRule } from '@/features/rules';

interface WorkspaceUngroupedProps {
  rules: MockRule[];
  onToggleRule: (id: string) => void;
  onEditRule: (id: string) => void;
  onDeleteRule: (id: string) => void;
}

export function WorkspaceUngrouped({
  rules,
  onToggleRule,
  onEditRule,
  onDeleteRule,
}: WorkspaceUngroupedProps) {
  if (rules.length === 0) return null;

  return (
    <div>
      <h3 className="text-sm font-medium text-content-muted mb-sm">
        Ungrouped
      </h3>
      <div className="flex flex-col gap-sm">
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
    </div>
  );
}
