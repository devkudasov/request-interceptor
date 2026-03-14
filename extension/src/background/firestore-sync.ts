import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import type { MockRule } from '@/features/rules';
import type { Collection } from '@/features/collections';

function getDb() {
  return getFirestore();
}

export async function pushCollection(
  teamId: string,
  localCollection: Collection,
  rules: MockRule[],
) {
  const db = getDb();

  await runTransaction(db, async (transaction) => {
    const colRef = doc(db, 'teams', teamId, 'collections', localCollection.id);
    const existing = await transaction.get(colRef);

    const currentVersion = existing.exists()
      ? (existing.data()?.version as number) ?? 0
      : 0;
    const newVersion = currentVersion + 1;

    transaction.set(colRef, {
      ...localCollection,
      rules,
      version: newVersion,
      updatedAt: serverTimestamp(),
    });
  });
}

export async function pullCollection(
  teamId: string,
  collectionId: string,
) {
  const db = getDb();
  const colRef = doc(db, 'teams', teamId, 'collections', collectionId);
  const snap = await getDoc(colRef);

  if (!snap.exists()) return null;

  const data = snap.data();

  const rulesSnap = await getDocs(
    collection(db, 'teams', teamId, 'collections', collectionId, 'rules'),
  );

  const rules = rulesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MockRule[];

  return {
    collection: data as Collection,
    rules,
  };
}

export function detectConflicts(
  local: Collection,
  remote: Collection,
): { hasConflict: boolean } {
  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  if (localTime !== remoteTime) {
    return { hasConflict: true };
  }

  return { hasConflict: false };
}

export function resolveConflict(
  strategy: string,
  local: Collection,
  remote: Collection,
): Collection {
  switch (strategy) {
    case 'replace-cloud':
      return { ...local };

    case 'replace-local':
      return { ...remote };

    case 'merge': {
      // Merge strategy: take remote's newer fields but keep local's id
      const localTime = new Date(local.updatedAt).getTime();
      const remoteTime = new Date(remote.updatedAt).getTime();
      return {
        ...local,
        ...remote,
        id: local.id,
        updatedAt: remoteTime > localTime ? remote.updatedAt : local.updatedAt,
      };
    }

    default:
      return { ...local };
  }
}

export async function getLastSyncTimestamp(
  teamId: string,
  collectionId: string,
): Promise<string | null> {
  const db = getDb();
  const syncRef = doc(db, 'syncTimestamps', `${teamId}_${collectionId}`);
  const snap = await getDoc(syncRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  return (data.lastSyncAt as string) ?? null;
}
