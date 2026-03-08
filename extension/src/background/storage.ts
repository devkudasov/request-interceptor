import type { StorageSchema } from '@/shared/types';
import { DEFAULT_STORAGE, STORAGE_KEYS } from '@/shared/constants';

type StorageKey = keyof typeof STORAGE_KEYS;
type StorageValue<K extends StorageKey> = StorageSchema[typeof STORAGE_KEYS[K]];

export async function getStorage<K extends StorageKey>(
  key: K,
): Promise<StorageValue<K>> {
  const storageKey = STORAGE_KEYS[key];
  const result = await chrome.storage.local.get(storageKey);
  return result[storageKey] ?? DEFAULT_STORAGE[storageKey as keyof StorageSchema];
}

export async function setStorage<K extends StorageKey>(
  key: K,
  value: StorageValue<K>,
): Promise<void> {
  const storageKey = STORAGE_KEYS[key];
  await chrome.storage.local.set({ [storageKey]: value });
}

export async function updateStorage<K extends StorageKey>(
  key: K,
  updater: (current: StorageValue<K>) => StorageValue<K>,
): Promise<StorageValue<K>> {
  const current = await getStorage(key);
  const updated = updater(current);
  await setStorage(key, updated);
  return updated;
}

export function onStorageChanged<K extends StorageKey>(
  key: K,
  callback: (newValue: StorageValue<K>, oldValue: StorageValue<K>) => void,
): () => void {
  const storageKey = STORAGE_KEYS[key];

  const listener = (changes: { [k: string]: chrome.storage.StorageChange }) => {
    if (storageKey in changes) {
      callback(
        changes[storageKey].newValue as StorageValue<K>,
        changes[storageKey].oldValue as StorageValue<K>,
      );
    }
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function initializeStorage(): Promise<void> {
  const result = await chrome.storage.local.get(null);
  const updates: Record<string, unknown> = {};

  for (const [key, defaultValue] of Object.entries(DEFAULT_STORAGE)) {
    if (!(key in result)) {
      updates[key] = defaultValue;
    }
  }

  if (Object.keys(updates).length > 0) {
    await chrome.storage.local.set(updates);
  }
}
