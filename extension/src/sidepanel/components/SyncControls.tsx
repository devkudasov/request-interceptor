import { useSyncStore, useTeamsStore, useAuthStore } from '@/shared/store';
import { Button } from '@/ui/common/Button';

export function SyncControls() {
  const { user } = useAuthStore();
  const { team } = useTeamsStore();
  const {
    syncing,
    lastSyncAt,
    conflict,
    error,
    pushToCloud,
    pullFromCloud,
    resolveConflict,
  } = useSyncStore();

  if (!user) {
    return (
      <div className="flex flex-col gap-sm bg-surface-card border border-border rounded-md p-sm">
        <p className="text-sm text-content-secondary">Log in to sync collections to the cloud.</p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col gap-sm bg-surface-card border border-border rounded-md p-sm">
        <p className="text-sm text-content-secondary">No team found. Create or join a team to sync.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-sm bg-surface-card border border-border rounded-md p-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-content-secondary">Cloud Sync</span>
        {syncing && <span className="text-xs text-content-muted">Syncing...</span>}
      </div>

      {error && (
        <div className="bg-status-error/10 text-status-error px-sm py-xs rounded text-xs">
          {error}
        </div>
      )}

      <div className="flex gap-xs">
        <Button
          size="sm"
          variant="secondary"
          onClick={pushToCloud}
          disabled={syncing}
        >
          Push to Cloud
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={pullFromCloud}
          disabled={syncing}
        >
          Pull from Cloud
        </Button>
      </div>

      {lastSyncAt && (
        <span className="text-xs text-content-muted">
          Last sync: {new Date(lastSyncAt).toLocaleString()}
        </span>
      )}

      {conflict && (
        <div className="flex flex-col gap-sm border-t border-border pt-sm">
          <p className="text-sm text-content-secondary">
            Conflict detected between local and remote versions.
          </p>
          <div className="flex gap-xs">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => resolveConflict('replace-cloud')}
            >
              Keep Local
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => resolveConflict('replace-local')}
            >
              Keep Remote
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
