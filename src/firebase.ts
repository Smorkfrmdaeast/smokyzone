import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import defaultConfig from '../firebase-applet-config.json';

const resolvedConfig = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || defaultConfig.projectId,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || defaultConfig.appId,
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || defaultConfig.apiKey,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || defaultConfig.authDomain,
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || defaultConfig.firestoreDatabaseId,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || defaultConfig.storageBucket,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultConfig.messagingSenderId,
};

function createFirestoreInstance(firebaseApp: FirebaseApp): Firestore {
  const dbId = resolvedConfig.firestoreDatabaseId;
  try {
    return dbId
      ? initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true }, dbId)
      : initializeFirestore(firebaseApp, { experimentalAutoDetectLongPolling: true });
  } catch {
    return dbId ? getFirestore(firebaseApp, dbId) : getFirestore(firebaseApp);
  }
}

const app: FirebaseApp = getApps().length === 0 ? initializeApp(resolvedConfig) : getApps()[0];
const db: Firestore = createFirestoreInstance(app);
const auth: Auth = getAuth(app);
const storage: FirebaseStorage = resolvedConfig.storageBucket
  ? getStorage(app, `gs://${resolvedConfig.storageBucket}`)
  : getStorage(app);

setPersistence(auth, browserLocalPersistence).catch(() => {});

export { app, db, auth, storage, resolvedConfig as firebaseConfig };
export default app;

