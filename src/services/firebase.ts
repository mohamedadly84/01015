import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { AppDatabase } from '../types';
import { initialData } from './initialData';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must use firestoreDatabaseId specified in firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot as required by specification
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline, falling back to local sync cache');
    }
    return false;
  }
}

const REALESTATE_DOC_PATH = 'realestate/main';

/**
 * Real-time cloud subscription:
 * Any change made by any team member instantly propagates to all other team members in real-time.
 */
export function subscribeToCloudDatabase(
  onData: (data: AppDatabase) => void,
  onError?: (err: any) => void
): () => void {
  const docRef = doc(db, 'realestate', 'main');

  const unsubscribe = onSnapshot(
    docRef,
    async (snapshot) => {
      if (snapshot.exists()) {
        const cloudData = snapshot.data() as AppDatabase;
        if (cloudData && Array.isArray(cloudData.units)) {
          onData(cloudData);
        }
      } else {
        // Document does not exist yet in cloud Firestore: initialize it with empty clean database
        try {
          await setDoc(docRef, {
            ...initialData,
            updatedAt: new Date().toISOString()
          });
          onData(initialData);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, REALESTATE_DOC_PATH);
        }
      }
    },
    (error) => {
      console.warn('Firestore onSnapshot subscription notice:', error);
      if (onError) onError(error);
      try {
        handleFirestoreError(error, OperationType.GET, REALESTATE_DOC_PATH);
      } catch {
        // Logged structured details via handleFirestoreError; prevented unhandled async crash
      }
    }
  );

  return unsubscribe;
}

/**
 * Saves database state directly to Firestore cloud storage
 */
export async function saveToCloudDatabase(data: AppDatabase): Promise<boolean> {
  const docRef = doc(db, 'realestate', 'main');
  try {
    await setDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, REALESTATE_DOC_PATH);
    return false;
  }
}

/**
 * Google Auth popup login
 */
export async function loginWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    console.error('Google sign in error:', err);
    throw err;
  }
}

export async function logoutFirebaseAuth(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}
