import { useState } from 'react';
import { useVersionStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';
import type { VersionSnapshot } from '@/shared/types';

export function VersionHistoryPage() {
  const {
    versions,
    selectedVersion,
    loading,
    error,
    restoreVersion,
  } = useVersionStore();

  const [restoreTargetId, setRestoreTargetId] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-md">
      <h2 className="text-lg font-semibold">Version History</h2>

      {error && (
        <div className="bg-status-error/10 text-status-error px-md py-sm rounded-md text-sm">
          {error}
        </div>
      )}

      {!loading && versions.length === 0 && (
        <p className="text-center py-lg text-content-secondary text-base">
          No versions yet. Push a collection to the cloud to create the first version.
        </p>
      )}

      <div className="flex flex-col gap-xs">
        {versions.map((version: VersionSnapshot) => (
          <div
            key={version.id}
            className="flex items-center gap-sm bg-surface-card border border-border rounded-md p-sm"
          >
            <div className="flex-1 min-w-0 text-sm">
              v{version.version} — {version.author.displayName} — {new Date(version.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRestoreTargetId(version.id)}
            >
              Restore
            </Button>
          </div>
        ))}
      </div>

      {/* Selected version preview */}
      {selectedVersion && (
        <div className="flex flex-col gap-sm border-t border-border pt-md">
          <h3 className="text-base font-medium">Version {selectedVersion.version} Preview</h3>
          <div className="flex flex-col gap-xs">
            {selectedVersion.rulesSnapshot.map((rule: { id: string; urlPattern: string; method: string; statusCode: number }) => (
              <div
                key={rule.id}
                className="bg-surface-primary border border-border rounded p-xs text-sm"
              >
                <span className="font-mono">
                  {rule.method} {rule.urlPattern}
                </span>
                <span className="text-content-muted ml-sm">Status: {rule.statusCode}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Restore confirmation */}
      {restoreTargetId && (
        <div className="flex flex-col gap-sm bg-surface-card border border-border rounded-md p-md">
          <p className="text-base text-content-secondary">
            Confirm restore? This will create a new version with the restored rules.
          </p>
          <div className="flex justify-end gap-sm">
            <Button variant="secondary" onClick={() => setRestoreTargetId(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                await restoreVersion(restoreTargetId);
                setRestoreTargetId(null);
              }}
              loading={loading}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
