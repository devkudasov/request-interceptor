import { Button } from '@/ui/common/Button';

interface WorkspaceEmptyStateProps {
  onCreateRule: () => void;
  onCreateCollection: () => void;
}

export function WorkspaceEmptyState({ onCreateRule, onCreateCollection }: WorkspaceEmptyStateProps) {
  return (
    <div className="text-center py-2xl text-content-secondary">
      <p className="text-base mb-md">No mock rules yet.</p>
      <p className="text-sm mb-lg">Create your first rule or organize with collections.</p>
      <div className="flex justify-center gap-sm">
        <Button onClick={onCreateRule}>Create Rule</Button>
        <Button variant="secondary" onClick={onCreateCollection}>Create Collection</Button>
      </div>
    </div>
  );
}
