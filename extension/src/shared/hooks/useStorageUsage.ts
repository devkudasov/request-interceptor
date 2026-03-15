import { useState, useEffect, useCallback } from 'react';

interface StorageUsageResult {
  usedBytes: number;
  loading: boolean;
}

export function useStorageUsage(): StorageUsageResult {
  const [usedBytes, setUsedBytes] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const bytes = await chrome.storage.local.getBytesInUse(null);
    setUsedBytes(bytes);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsage();

    const listener = () => {
      fetchUsage();
    };

    const onChanged = chrome.storage.onChanged;
    onChanged.addListener(listener);

    return () => {
      onChanged.removeListener(listener);
    };
  }, [fetchUsage]);

  return { usedBytes, loading };
}
