import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  startAfter,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

function getDb() {
  return getFirestore();
}

interface VersionHistoryOptions {
  limit?: number;
  startAfter?: unknown;
}

export async function getVersionHistory(
  teamId: string,
  collectionId: string,
  options?: VersionHistoryOptions,
) {
  const db = getDb();
  const versionsRef = collection(
    db,
    'teams',
    teamId,
    'collections',
    collectionId,
    'versions',
  );

  const queryConstraints: unknown[] = [
    versionsRef,
    orderBy('createdAt', 'desc'),
  ];

  if (options?.limit) {
    queryConstraints.push(firestoreLimit(options.limit));
  }

  if (options?.startAfter) {
    queryConstraints.push(startAfter(options.startAfter));
  }

  const q = query(...(queryConstraints as Parameters<typeof query>));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Record<string, unknown>),
  }));
}

export async function getVersion(
  teamId: string,
  collectionId: string,
  versionId: string,
) {
  const db = getDb();
  const versionRef = doc(
    db,
    'teams',
    teamId,
    'collections',
    collectionId,
    'versions',
    versionId,
  );
  const snap = await getDoc(versionRef);

  if (!snap.exists()) return null;

  const data = snap.data();
  return {
    id: snap.id,
    ...data,
  };
}

export async function restoreVersion(
  teamId: string,
  collectionId: string,
  versionId: string,
) {
  const db = getDb();

  // Get the version to restore
  const versionRef = doc(
    db,
    'teams',
    teamId,
    'collections',
    collectionId,
    'versions',
    versionId,
  );
  const versionSnap = await getDoc(versionRef);

  if (!versionSnap.exists()) {
    throw new Error('Version not found');
  }

  const versionData = versionSnap.data();

  // Create a new version entry for the restore
  const versionsRef = collection(
    db,
    'teams',
    teamId,
    'collections',
    collectionId,
    'versions',
  );

  const newVersion = await addDoc(versionsRef, {
    ...versionData,
    restoredFrom: versionId,
    createdAt: serverTimestamp(),
  });

  // Update the collection with the restored data
  if (versionData.collectionSnapshot) {
    const colRef = doc(db, 'teams', teamId, 'collections', collectionId);
    await setDoc(colRef, {
      ...versionData.collectionSnapshot,
      updatedAt: serverTimestamp(),
    });
  }

  return { id: newVersion.id };
}
