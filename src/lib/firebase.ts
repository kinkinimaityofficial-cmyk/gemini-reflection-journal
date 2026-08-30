import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { JournalEntry, UserProfile } from '../types';

// Initialize Firebase App instance safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Custom database instance or default
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Strict Undefined-Stripping (Zero-Crash Payload Hygiene)
 * Recursively removes all `undefined` properties before passing to Firestore
 */
export function sanitizePayload<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizePayload(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data as Record<string, any>)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizePayload(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

/**
 * Google Sign-In with popup
 */
export async function signInWithGoogle(): Promise<UserProfile> {
  const result = await signInWithPopup(auth, googleProvider);
  const user = result.user;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
  };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Listen to auth state changes
 */
export function subscribeToAuth(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, (user: FirebaseUser | null) => {
    if (user) {
      callback({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Save or update a journal interaction for the isolated user
 */
export async function saveJournalEntry(userId: string, entry: JournalEntry): Promise<void> {
  if (!userId) throw new Error('User ID is required to save journal entry');
  if (!entry.id) throw new Error('Entry ID is required');

  const sanitized = sanitizePayload<JournalEntry>({
    ...entry,
    userId,
    updatedAt: Date.now(),
  });

  const entryRef = doc(db, 'users', userId, 'interactions', entry.id);
  await setDoc(entryRef, sanitized, { merge: true });
}

/**
 * Fetch all journal interactions for the user (isolated)
 */
export async function fetchUserEntries(userId: string): Promise<JournalEntry[]> {
  if (!userId) return [];

  const interactionsRef = collection(db, 'users', userId, 'interactions');
  const q = query(interactionsRef, orderBy('createdAt', 'desc'));

  try {
    const snapshot = await getDocs(q);
    const entries: JournalEntry[] = [];
    snapshot.forEach((docSnap) => {
      entries.push(docSnap.data() as JournalEntry);
    });
    return entries;
  } catch (error) {
    console.error('Error fetching user interactions from Firestore:', error);
    // Fallback query without orderBy if index is still propagating
    try {
      const fallbackSnap = await getDocs(interactionsRef);
      const entries: JournalEntry[] = [];
      fallbackSnap.forEach((docSnap) => {
        entries.push(docSnap.data() as JournalEntry);
      });
      return entries.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    } catch (fallbackError) {
      console.error('Fallback query failed:', fallbackError);
      throw fallbackError;
    }
  }
}

/**
 * Delete a specific entry
 */
export async function deleteJournalEntry(userId: string, entryId: string): Promise<void> {
  if (!userId || !entryId) throw new Error('User ID and Entry ID are required');
  const entryRef = doc(db, 'users', userId, 'interactions', entryId);
  await deleteDoc(entryRef);
}
