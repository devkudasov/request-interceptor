import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  updateDoc,
  serverTimestamp,
  addDoc,
} from 'firebase/firestore';

function getDb() {
  return getFirestore();
}

export async function createTeam(name: string) {
  const db = getDb();
  const teamRef = doc(collection(db, 'teams'));

  await setDoc(teamRef, {
    name,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const memberRef = doc(collection(db, 'teams', teamRef.id, 'members'));
  await setDoc(memberRef, {
    role: 'owner',
    joinedAt: serverTimestamp(),
  });

  return { id: teamRef.id, name };
}

export async function inviteMember(teamId: string, email: string) {
  const db = getDb();
  const invitesRef = collection(db, 'invites');

  const result = await addDoc(invitesRef, {
    email,
    teamId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return { id: result.id };
}

export async function acceptInvite(inviteId: string) {
  const db = getDb();
  const inviteRef = doc(db, 'invites', inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Invite not found');
  }

  await updateDoc(inviteRef, { status: 'accepted' });
}

export async function declineInvite(inviteId: string) {
  const db = getDb();
  const inviteRef = doc(db, 'invites', inviteId);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Invite not found');
  }

  await deleteDoc(inviteRef);
}

export async function updateMemberRole(
  teamId: string,
  userId: string,
  role: string,
) {
  const db = getDb();
  const memberRef = doc(db, 'teams', teamId, 'members', userId);

  // Check the caller's role — only admins/owners can update roles
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists()) {
    const data = memberSnap.data();
    if (data.role === 'member') {
      throw new Error('Only admins and owners can manage member roles');
    }
  }

  await updateDoc(memberRef, { role });
}

export async function removeMember(teamId: string, userId: string) {
  const db = getDb();
  const memberRef = doc(db, 'teams', teamId, 'members', userId);

  // Check the member's role
  const memberSnap = await getDoc(memberRef);
  if (memberSnap.exists()) {
    const data = memberSnap.data();
    if (data.role === 'owner' || data.role === 'admin') {
      // Check if this is the last owner/admin
      const membersSnap = await getDocs(
        query(collection(db, 'teams', teamId, 'members')),
      );
      const adminsAndOwners = membersSnap.docs.filter((d) => {
        const r = d.data().role;
        return r === 'owner' || r === 'admin';
      });
      if (adminsAndOwners.length <= 1) {
        throw new Error('Cannot remove the last owner/admin');
      }
    }
  }

  await deleteDoc(memberRef);
}

export async function deleteTeam(teamId: string) {
  const db = getDb();

  // Delete all members
  const membersSnap = await getDocs(collection(db, 'teams', teamId, 'members'));
  for (const memberDoc of membersSnap.docs) {
    await deleteDoc(memberDoc.ref);
  }

  // Delete team doc
  await deleteDoc(doc(db, 'teams', teamId));
}

export async function getTeam(teamId: string) {
  const db = getDb();
  const teamSnap = await getDoc(doc(db, 'teams', teamId));

  if (!teamSnap.exists()) return null;

  const teamData = teamSnap.data();
  const membersSnap = await getDocs(collection(db, 'teams', teamId, 'members'));

  const members = membersSnap.docs.map((d) => {
    const data = d.data();
    return {
      userId: d.id,
      email: data.email as string,
      role: data.role as string,
      displayName: (data.displayName as string) ?? null,
    };
  });

  return {
    name: teamData.name as string,
    members,
  };
}

export async function getUserTeams(userId: string) {
  const db = getDb();
  const membershipsSnap = await getDocs(
    query(collection(db, 'memberships'), where('userId', '==', userId)),
  );

  return membershipsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      teamId: data.teamId,
      role: data.role,
    };
  });
}

export async function getPendingInvites(email: string) {
  const db = getDb();
  const q = query(
    collection(db, 'invites'),
    where('email', '==', email),
    where('status', '==', 'pending'),
  );
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      ...data,
    };
  });
}
