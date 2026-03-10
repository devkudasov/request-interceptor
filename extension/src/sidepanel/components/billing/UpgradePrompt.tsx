import { Button } from '@/ui/common/Button';

interface UpgradePromptProps {
  message: string;
  onUpgrade: () => void;
  onClose: () => void;
}

export function UpgradePrompt({ message, onUpgrade, onClose }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        role="alertdialog"
        aria-labelledby="upgrade-prompt-title"
        aria-describedby="upgrade-prompt-message"
        className="bg-surface-primary border border-border rounded-lg p-md w-80"
      >
        <h3 id="upgrade-prompt-title" className="text-sm font-medium mb-sm">
          Upgrade Required
        </h3>
        <p id="upgrade-prompt-message" className="text-sm text-content-secondary mb-md">
          {message}
        </p>
        <div className="flex gap-xs justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={onUpgrade}>
            Upgrade
          </Button>
        </div>
      </div>
    </div>
  );
}
