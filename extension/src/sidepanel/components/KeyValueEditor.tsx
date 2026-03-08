import { Button } from '@/ui/common/Button';

interface KeyValueEditorProps {
  entries: Array<[string, string]>;
  onChange: (entries: Array<[string, string]>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({
  entries,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueEditorProps) {
  const update = (index: number, pos: 0 | 1, value: string) => {
    const copy = entries.map((e) => [...e] as [string, string]);
    copy[index][pos] = value;
    onChange(copy);
  };

  const remove = (index: number) => {
    onChange(entries.filter((_, i) => i !== index));
  };

  const add = () => {
    onChange([...entries, ['', '']]);
  };

  return (
    <div className="flex flex-col gap-xs">
      {entries.map(([key, value], i) => (
        <div key={i} className="flex gap-xs items-center">
          <input
            className="flex-1 px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
            placeholder={keyPlaceholder}
            value={key}
            onChange={(e) => update(i, 0, e.target.value)}
          />
          <input
            className="flex-1 px-sm py-xs text-sm bg-surface-secondary text-content-primary border border-border rounded font-mono"
            placeholder={valuePlaceholder}
            value={value}
            onChange={(e) => update(i, 1, e.target.value)}
          />
          <button
            onClick={() => remove(i)}
            className="text-content-muted hover:text-status-error text-sm px-xs"
          >
            &times;
          </button>
        </div>
      ))}
      <Button variant="ghost" size="sm" onClick={add}>
        + Add {keyPlaceholder}
      </Button>
    </div>
  );
}
