import { Button } from '@/ui/common/Button';
import { Input } from '@/ui/common/Input';
import { Select } from '@/ui/common/Select';
import { ToolbarOverflowMenu } from './ToolbarOverflowMenu';

const METHOD_OPTIONS = [
  { value: 'ALL', label: 'All Methods' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'PATCH', label: 'PATCH' },
  { value: 'DELETE', label: 'DELETE' },
];

interface WorkspaceToolbarProps {
  urlFilter: string;
  onUrlFilterChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  methodFilter: string;
  onMethodFilterChange: (value: string) => void;
  onNewRule: () => void;
  onNewCollection: () => void;
  onImport: () => void;
  onExport: () => void;
  hasCollections: boolean;
}

export function WorkspaceToolbar({
  urlFilter,
  onUrlFilterChange,
  methodFilter,
  onMethodFilterChange,
  onNewRule,
  onNewCollection,
  onImport,
  onExport,
  hasCollections,
}: WorkspaceToolbarProps) {
  return (
    <div className="flex flex-col gap-sm">
      <div className="flex gap-sm">
        <div className="flex-1">
          <Input
            placeholder="Filter by URL..."
            value={urlFilter}
            onChange={onUrlFilterChange}
          />
        </div>
        <Select
          options={METHOD_OPTIONS}
          value={methodFilter}
          onChange={onMethodFilterChange}
        />
      </div>
      <div className="flex gap-xs items-center">
        <Button size="sm" onClick={onNewRule}>+ New Rule</Button>
        <div className="flex-1" />
        <ToolbarOverflowMenu
          onNewCollection={onNewCollection}
          onImport={onImport}
          onExport={onExport}
          hasCollections={hasCollections}
        />
      </div>
    </div>
  );
}
