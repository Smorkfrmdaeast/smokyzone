import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { doc, getDoc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { addActivityLog } from './siteStore';

export const getDeviceInfo = (): string => {
  if (typeof navigator === 'undefined') return 'Unknown Device';
  const ua = navigator.userAgent;

  let deviceType = 'Desktop';
  if (/mobile/i.test(ua)) deviceType = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) deviceType = 'Tablet';

  let os = 'Unknown OS';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(ua)) os = 'macOS';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/linux/i.test(ua)) os = 'Linux';

  let browser = 'Browser';
  if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edg/i.test(ua)) browser = 'Edge';

  const dims = typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : '';
  return `${deviceType} (${os} · ${browser}${dims ? ` · ${dims}` : ''})`;
};

const FAILED_ATTEMPTS_KEY = 'smokyzone_failed_logins';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export interface RateLimitStatus {
  isLocked: boolean;
  remainingSeconds: number;
}

export const getRateLimitStatus = (): RateLimitStatus => {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const timestamps: number[] = JSON.parse(raw);
    const now = Date.now();
    const recent = timestamps.filter((t) => now - t < LOCKOUT_WINDOW_MS);

    if (recent.length >= MAX_FAILED_ATTEMPTS) {
      const oldestOfWindow = Math.min(...recent);
      const remaining = Math.max(0, Math.ceil((oldestOfWindow + LOCKOUT_WINDOW_MS - now) / 1000));
      return { isLocked: remaining > 0, remainingSeconds: remaining };
    }
  } catch {
    // fallback
  }
  return { isLocked: false, remainingSeconds: 0 };
};

const recordFailedAttempt = () => {
  try {
    const raw = localStorage.getItem(FAILED_ATTEMPTS_KEY);
    const timestamps: number[] = raw ? JSON.parse(raw) : [];
    const now = Date.now();
    const updated = [...timestamps.filter((t) => now - t < LOCKOUT_WINDOW_MS), now];
    localStorage.setItem(FAILED_ATTEMPTS_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
};

const clearFailedAttempts = () => {
  try {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  } catch {
    // ignore
  }
};

export const checkOwnerAccountStatus = async (): Promise<{ ownerExists: boolean; ownerEmail?: string }> => {
  try {
    // This public status document contains only a boolean, never owner credentials or email.
    const statusRef = doc(db, 'system', 'owner_status');
    const snap = await getDoc(statusRef);
    return { ownerExists: snap.exists() && snap.data()?.owner_registered === true };
  } catch (err) {
    console.warn('Could not verify owner setup status:', err);
    // Fail closed: never offer public owner registration when status cannot be verified.
    return { ownerExists: true };
  }
};

export const createOwnerAccount = async (email: string, password: string): Promise<User> => {
  if (email.trim().toLowerCase() !== 'ifeanyinuels32@gmail.com') {
    throw new Error('Owner setup is restricted to the approved Smoky Zone owner email address.');
  }
  if (password.length < 10) {
    throw new Error('Password must be at least 10 characters long.');
  }

  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const ownerRef = doc(db, 'system', 'admin_status');
  const statusRef = doc(db, 'system', 'owner_status');
  const batch = writeBatch(db);

  // Atomically claim the single owner slot and publish a non-sensitive setup flag.
  batch.set(ownerRef, {
    owner_registered: true,
    owner_uid: cred.user.uid,
    owner_email: email,
    createdAt: new Date().toISOString(),
    createdDevice: getDeviceInfo(),
  });
  batch.set(statusRef, { owner_registered: true });

  try {
    await batch.commit();
  } catch (err) {
    await signOut(auth);
    throw new Error('Owner account could not be registered in the database. Please check Firestore rules and try again.');
  }

  localStorage.setItem('smokyzone_owner_initialized', 'true');
  localStorage.setItem('smokyzone_owner_uid', cred.user.uid);
  addActivityLog(
    'Owner Account Created',
    `First-time setup completed for ${email} from ${getDeviceInfo()}`,
    'security'
  );
  return cred.user;
};

export const loginOwner = async (email: string, password: string): Promise<User> => {
  const status = getRateLimitStatus();
  if (status.isLocked) {
    throw new Error(
      `Rate limit exceeded due to multiple failed attempts. Please wait ${status.remainingSeconds}s before trying again.`
    );
  }

  if (email.trim().toLowerCase() !== 'ifeanyinuels32@gmail.com') {
    throw new Error('This email address is not authorised for Smoky Zone owner access.');
  }

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const ownerSnapshot = await getDoc(doc(db, 'system', 'admin_status'));
    if (!ownerSnapshot.exists() || ownerSnapshot.data()?.owner_uid !== cred.user.uid) {
      await signOut(auth);
      throw new Error('This Firebase account is not the registered Smoky Zone owner account.');
    }
    localStorage.setItem('smokyzone_owner_uid', cred.user.uid);
    clearFailedAttempts();

    addActivityLog(
      'Owner Logged In',
      `Successful authentication for ${email} on ${getDeviceInfo()}`,
      'security'
    );

    return cred.user;
  } catch (err: unknown) {
    recordFailedAttempt();
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('auth/invalid-credential') || errMsg.includes('auth/wrong-password')) {
      throw new Error('Invalid email or password. Please verify and try again.');
    }
    throw err;
  }
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
  addActivityLog(
    'Password Reset Requested',
    `Reset email dispatched for ${email} from ${getDeviceInfo()}`,
    'security'
  );
};

export const changeOwnerPassword = async (
  currentPass: string,
  newPass: string,
  confirmPass: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user || !user.email) {
    throw new Error('No owner account is currently signed in.');
  }

  if (newPass !== confirmPass) {
    throw new Error('New passwords do not match.');
  }

  if (newPass.length < 10) {
    throw new Error('New password must be at least 10 characters long.');
  }

  // Re-authenticate first
  const credential = EmailAuthProvider.credential(user.email, currentPass);
  await reauthenticateWithCredential(user, credential);

  // Update password
  await updatePassword(user, newPass);

  addActivityLog(
    'Owner Password Changed',
    `Password was successfully updated by owner from ${getDeviceInfo()}`,
    'security'
  );
};

export const logoutOwner = async (): Promise<void> => {
  const userEmail = auth.currentUser?.email || 'Owner';
  await signOut(auth);

  addActivityLog(
    'Owner Logged Out',
    `User ${userEmail} signed out from ${getDeviceInfo()}`,
    'security'
  );
};

// 15-Minute Inactivity Auto-Logout Watcher
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000; // 15 minutes

export const initInactivityWatcher = (onTimeout: () => void): (() => void) => {
  let timer: number | null = null;

  const resetTimer = () => {
    if (timer !== null) {
      window.clearTimeout(timer);
    }
    if (auth.currentUser) {
      timer = window.setTimeout(async () => {
        try {
          await logoutOwner();
        } catch {
          // ignore
        }
        onTimeout();
      }, INACTIVITY_LIMIT_MS);
    }
  };

  const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
  activityEvents.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));

  // Initial check
  resetTimer();

  const unsubAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      resetTimer();
    } else if (timer !== null) {
      window.clearTimeout(timer);
      timer = null;
    }
  });

  return () => {
    if (timer !== null) window.clearTimeout(timer);
    activityEvents.forEach((ev) => window.removeEventListener(ev, resetTimer));
    unsubAuth();
  };
};
