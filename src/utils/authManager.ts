import {
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from '../firebase';
import {
  addActivityLog,
  isVerifiedOwnerEmail,
  getUserPrimaryEmail,
  isFirebaseUserEmailVerified,
  setUidIdentityCache,
  clearUidIdentityCache,
  ResolvedFirebaseIdentity,
  setVerifiedOwnerSessionCache,
  getVerifiedOwnerUidMatch,
  markFirebaseAuthInitialized,
  hasActivePasscodeSession,
  setPasscodeSession,
  clearPasscodeSession,
  ensureOwnerAdminStatusDoc,
  checkOwnerAdminStatusDoc,
  publishCurrentConfigToCloud,
  updateCloudSyncState,
  OWNER_EMAIL,
  OWNER_EMAIL_DISPLAY,
} from './siteStore';

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
const PASSCODE_HASH_KEY = 'smokyzone_owner_passcode_hash_v1';
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

export const recordFailedAttempt = () => {
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

export const clearFailedAttempts = () => {
  try {
    localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  } catch {
    // ignore
  }
};

async function hashPasscode(passcode: string): Promise<string> {
  const salted = `smokyzone_v1:${OWNER_EMAIL}:${passcode}`;
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    try {
      const encoded = new TextEncoder().encode(salted);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fallback below
    }
  }
  let h = 2166136261;
  for (let i = 0; i < salted.length; i++) {
    h ^= salted.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `fnv_${(h >>> 0).toString(16)}`;
}

export const hasOwnerPasscodeConfigured = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    return Boolean(localStorage.getItem(PASSCODE_HASH_KEY));
  } catch {
    return false;
  }
};

// First-time passcode setup & immediate sign-in (previous style, zero popup friction)
export const setupOwnerPasscode = async (
  email: string,
  passcode: string,
  confirmPasscode: string
): Promise<void> => {
  if (!isVerifiedOwnerEmail(email)) {
    recordFailedAttempt();
    throw new Error(`Access denied: Owner access is locked to ${OWNER_EMAIL_DISPLAY}.`);
  }
  if (!passcode || passcode.length < 4) {
    throw new Error('Passcode must be at least 4 characters.');
  }
  if (passcode !== confirmPasscode) {
    throw new Error('Passcodes do not match. Please check and try again.');
  }

  const digest = await hashPasscode(passcode);
  localStorage.setItem(PASSCODE_HASH_KEY, digest);
  localStorage.setItem('smokyzone_owner_initialized', 'true');
  clearFailedAttempts();
  setPasscodeSession(OWNER_EMAIL);

  console.info('[SmokyZone Auth] Owner passcode created and session unlocked:', OWNER_EMAIL_DISPLAY);
  window.dispatchEvent(
    new CustomEvent('smokyzone_auth_change', {
      detail: { authenticated: true, email: OWNER_EMAIL, userInitiated: true },
    })
  );

  addActivityLog(
    'Owner Passcode Set',
    `Owner Studio passcode configured for ${OWNER_EMAIL_DISPLAY} on ${getDeviceInfo()}`,
    'security'
  );
};

// Previous style Email + Passcode sign-in
export const loginOwnerWithPasscode = async (email: string, passcode: string): Promise<void> => {
  const status = getRateLimitStatus();
  if (status.isLocked) {
    throw new Error(
      `Too many unsuccessful attempts. Please wait ${status.remainingSeconds}s before trying again.`
    );
  }

  if (!isVerifiedOwnerEmail(email)) {
    recordFailedAttempt();
    throw new Error(`Invalid owner email. Please sign in with ${OWNER_EMAIL_DISPLAY}.`);
  }

  const savedHash = localStorage.getItem(PASSCODE_HASH_KEY);
  if (!savedHash) {
    throw new Error('No passcode configured on this browser yet. Please create one below.');
  }

  const attemptHash = await hashPasscode(passcode);
  if (attemptHash !== savedHash) {
    recordFailedAttempt();
    throw new Error('Incorrect owner passcode. Please try again.');
  }

  clearFailedAttempts();
  localStorage.setItem('smokyzone_owner_initialized', 'true');
  setPasscodeSession(OWNER_EMAIL);

  console.info('[SmokyZone Auth] Owner verified via passcode:', OWNER_EMAIL_DISPLAY);
  window.dispatchEvent(
    new CustomEvent('smokyzone_auth_change', {
      detail: { authenticated: true, email: OWNER_EMAIL, userInitiated: true },
    })
  );

  addActivityLog(
    'Owner Logged In (Passcode)',
    `Signed in as ${OWNER_EMAIL_DISPLAY} on ${getDeviceInfo()}`,
    'security'
  );
};

// Update owner passcode from inside Owner Studio -> Passcode & Cloud tab
export const changeOwnerPasscode = async (
  currentPasscode: string,
  newPasscode: string,
  confirmPasscode: string
): Promise<void> => {
  if (!newPasscode || newPasscode.length < 4) {
    throw new Error('New passcode must be at least 4 characters.');
  }
  if (newPasscode !== confirmPasscode) {
    throw new Error('New passcodes do not match.');
  }

  const savedHash = localStorage.getItem(PASSCODE_HASH_KEY);
  if (savedHash) {
    const currentHash = await hashPasscode(currentPasscode);
    if (currentHash !== savedHash) {
      throw new Error('Current passcode is incorrect.');
    }
  }

  const nextHash = await hashPasscode(newPasscode);
  localStorage.setItem(PASSCODE_HASH_KEY, nextHash);
  localStorage.setItem('smokyzone_owner_pass_updated', new Date().toISOString());

  addActivityLog(
    'Owner Passcode Updated',
    `Passcode updated from ${getDeviceInfo()}`,
    'security'
  );
};

// Track active Google login flow so initOwnerSessionGuard never interrupts popup verification
let isSignInFlowActive = false;

export const resolveFirebaseUserIdentity = async (
  user: User | null,
  cred?: UserCredential | null
): Promise<ResolvedFirebaseIdentity> => {
  if (!user) {
    return {
      email: null,
      emailVerified: false,
      source: 'none',
      claimKeys: [],
      hasTokenEmailClaim: false,
    };
  }

  // Force profile reload if SDK top-level email wasn't immediately hydrated after popup
  if (!user.email) {
    await user.reload().catch(() => {});
  }

  let tokenEmail: string | null = null;
  let tokenEmailVerified = false;
  let googleIdentityEmail: string | null = null;
  let claimKeys: string[] = [];

  try {
    const tokenResult = await user.getIdTokenResult(true).catch(() => user.getIdTokenResult(false));
    const claims = tokenResult?.claims as Record<string, unknown> | undefined;
    if (claims) {
      claimKeys = Object.keys(claims);
      if (typeof claims.email === 'string' && claims.email.trim()) {
        tokenEmail = claims.email.trim().toLowerCase();
      }
      if (claims.email_verified === true) {
        tokenEmailVerified = true;
      }
      const firebaseBlock = claims.firebase as { identities?: Record<string, unknown> } | undefined;
      const googleIds = firebaseBlock?.identities?.['google.com'];
      const emailIds = firebaseBlock?.identities?.email;
      const firstGoogle = Array.isArray(googleIds)
        ? googleIds.find((item) => typeof item === 'string' && item.includes('@'))
        : null;
      const firstEmailId = Array.isArray(emailIds)
        ? emailIds.find((item) => typeof item === 'string' && item.includes('@'))
        : null;
      const rawIdentity = (firstGoogle || firstEmailId) as string | undefined;
      if (rawIdentity) {
        googleIdentityEmail = rawIdentity.trim().toLowerCase();
      }
    }
  } catch (err) {
    console.warn('[SmokyZone Auth] Unable to inspect Firebase ID token claims:', err);
  }

  const additionalInfo = (() => {
    if (!cred) return null;
    try {
      return getAdditionalUserInfo(cred);
    } catch {
      return null;
    }
  })();

  const profile = (additionalInfo?.profile || {}) as {
    email?: unknown;
    email_verified?: unknown;
    verified_email?: unknown;
  };
  const profileEmail =
    typeof profile.email === 'string' && profile.email.trim()
      ? profile.email.trim().toLowerCase()
      : null;

  const tokenResp = (
    cred as unknown as {
      _tokenResponse?: { email?: string; emailVerified?: boolean };
    } | null
  )?._tokenResponse;
  const tokenRespEmail =
    typeof tokenResp?.email === 'string' && tokenResp.email.trim()
      ? tokenResp.email.trim().toLowerCase()
      : null;

  const providerGoogleEmail =
    user.providerData
      ?.find((p) => p?.providerId === 'google.com' && p?.email && p.email.trim())
      ?.email?.trim()
      .toLowerCase() || null;

  const providerAnyEmail =
    user.providerData?.find((p) => p?.email && p.email.trim())?.email?.trim().toLowerCase() || null;

  const isGoogleProviderLinked = Boolean(
    user.providerData?.some((p) => p?.providerId === 'google.com')
  );

  let resolvedEmail: string | null = null;
  let source = 'none';
  let uidConfirmed = false;

  if (user.email && user.email.trim()) {
    resolvedEmail = user.email.trim().toLowerCase();
    source = 'user.email';
  } else if (tokenEmail) {
    resolvedEmail = tokenEmail;
    source = 'idToken.claims.email';
  } else if (providerGoogleEmail) {
    resolvedEmail = providerGoogleEmail;
    source = 'providerData.google.com';
  } else if (providerAnyEmail) {
    resolvedEmail = providerAnyEmail;
    source = 'providerData';
  } else if (profileEmail) {
    resolvedEmail = profileEmail;
    source = 'additionalUserInfo.profile';
  } else if (tokenRespEmail) {
    resolvedEmail = tokenRespEmail;
    source = '_tokenResponse';
  } else if (googleIdentityEmail) {
    resolvedEmail = googleIdentityEmail;
    source = 'idToken.claims.firebase.identities';
  } else if (isGoogleProviderLinked && getVerifiedOwnerUidMatch(user.uid)) {
    resolvedEmail = OWNER_EMAIL;
    source = 'verifiedOwnerUidCache';
    uidConfirmed = true;
  } else if (isGoogleProviderLinked) {
    // Fallback check against authoritative Firestore system/admin_status doc (when UID rules are deployed)
    const statusDoc = await checkOwnerAdminStatusDoc().catch(() => null);
    if (
      statusDoc?.exists &&
      statusDoc.ownerRegistered &&
      isVerifiedOwnerEmail(statusDoc.ownerEmail) &&
      statusDoc.matchesOwnerUid
    ) {
      resolvedEmail = OWNER_EMAIL;
      source = 'firestore.system/admin_status';
      uidConfirmed = true;
    }
  }

  const emailVerified = Boolean(
    tokenEmailVerified ||
      user.emailVerified === true ||
      profile.email_verified === true ||
      profile.verified_email === true ||
      tokenResp?.emailVerified === true ||
      uidConfirmed
  );

  const identity: ResolvedFirebaseIdentity = {
    email: resolvedEmail,
    emailVerified,
    source,
    claimKeys,
    hasTokenEmailClaim: Boolean(tokenEmail),
  };

  if (resolvedEmail) {
    setUidIdentityCache(user.uid, identity);
  }

  return identity;
};

// Google Sign-In locked strictly to Ifeanyinuels32@gmail.com
export const loginOwnerWithGoogle = async (options?: { forceAccountChooser?: boolean }): Promise<User> => {
  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady().catch(() => {});
  }

  if (auth.currentUser && !getUserPrimaryEmail(auth.currentUser)) {
    await resolveFirebaseUserIdentity(auth.currentUser);
  }

  const existingEmail = getUserPrimaryEmail(auth.currentUser);
  if (
    !options?.forceAccountChooser &&
    auth.currentUser &&
    existingEmail &&
    isVerifiedOwnerEmail(existingEmail) &&
    isFirebaseUserEmailVerified(auth.currentUser)
  ) {
    await auth.currentUser.getIdToken(true).catch(() => {});
    setVerifiedOwnerSessionCache(existingEmail, auth.currentUser.uid);
    setPasscodeSession(existingEmail);
    updateCloudSyncState({
      firebaseAuthVerified: true,
      firebaseAuthEmail: existingEmail,
      error: null,
    });
    await ensureOwnerAdminStatusDoc(getDeviceInfo()).catch((syncErr) => {
      console.warn('[SmokyZone Auth] Could not sync system/admin_status on active session:', syncErr);
    });
    await publishCurrentConfigToCloud().catch(() => {});
    window.dispatchEvent(
      new CustomEvent('smokyzone_auth_change', {
        detail: { authenticated: true, email: existingEmail, userInitiated: true },
      })
    );
    return auth.currentUser;
  }

  isSignInFlowActive = true;
  try {
    // If a non-owner Google account was cached in Firebase Auth, clear it before switching
    if (auth.currentUser && (!existingEmail || !isVerifiedOwnerEmail(existingEmail))) {
      clearUidIdentityCache(auth.currentUser.uid);
      await signOut(auth).catch(() => {});
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    // Always show account chooser + hint so users signed into another Google account (e.g. nuelsbussiness@gmail.com)
    // can reliably pick ifeanyinuels32@gmail.com
    provider.setCustomParameters({
      prompt: 'select_account',
      login_hint: OWNER_EMAIL_DISPLAY,
    });

    const cred = await signInWithPopup(auth, provider);
    // Force refresh ID token so claims reflect latest Firebase Auth state
    await cred.user.getIdToken(true).catch(() => {});
    const identity = await resolveFirebaseUserIdentity(cred.user, cred);
    const resolvedEmail = identity.email;

    console.info('[SmokyZone Auth] Google Sign-In resolved identity:', {
      uid: cred.user.uid,
      email: resolvedEmail,
      emailVerified: identity.emailVerified,
      source: identity.source,
      hasTokenEmailClaim: identity.hasTokenEmailClaim,
      claimKeys: identity.claimKeys,
    });

    if (!resolvedEmail || !isVerifiedOwnerEmail(resolvedEmail)) {
      clearUidIdentityCache(cred.user.uid);
      await signOut(auth).catch(() => {});
      setVerifiedOwnerSessionCache(null);
      updateCloudSyncState({
        firebaseAuthVerified: false,
        firebaseAuthEmail: null,
      });
      window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: false } }));
      throw new Error(
        resolvedEmail
          ? `Signed in as ${resolvedEmail}, which is not the owner account. Please select ${OWNER_EMAIL_DISPLAY} in the Google chooser.`
          : `Google sign-in completed (UID: ${cred.user.uid}) without an email claim (claims: ${
              identity.claimKeys?.join(', ') || 'none'
            }). Select ${OWNER_EMAIL_DISPLAY} in the Google chooser.`
      );
    }

    if (!identity.emailVerified) {
      clearUidIdentityCache(cred.user.uid);
      await signOut(auth).catch(() => {});
      setVerifiedOwnerSessionCache(null);
      throw new Error(
        `Google reported unverified email for ${resolvedEmail}. Verified email claims are required.`
      );
    }

    clearFailedAttempts();
    localStorage.setItem('smokyzone_owner_initialized', 'true');
    setUidIdentityCache(cred.user.uid, identity);
    setVerifiedOwnerSessionCache(resolvedEmail, cred.user.uid);
    setPasscodeSession(resolvedEmail);
    updateCloudSyncState({
      firebaseAuthVerified: true,
      firebaseAuthEmail: resolvedEmail,
      error: null,
    });

    if (identity.claimKeys && identity.claimKeys.length > 0 && !identity.hasTokenEmailClaim) {
      console.info(
        `[SmokyZone Auth] Signed in as approved owner (${resolvedEmail}, UID: ${cred.user.uid}). Firebase ID token lacks top-level email claim; authenticating via approved owner UID.`
      );
    }

    let adminStatusSynced = false;
    try {
      adminStatusSynced = await ensureOwnerAdminStatusDoc(getDeviceInfo());
    } catch (syncErr) {
      console.warn('[SmokyZone Auth] Could not write system/admin_status owner doc:', syncErr);
    }

    if (adminStatusSynced) {
      await publishCurrentConfigToCloud().catch(() => {});
    } else {
      const existingAdminStatus = await checkOwnerAdminStatusDoc().catch(() => null);
      if (existingAdminStatus?.exists && existingAdminStatus.matchesOwnerUid) {
        updateCloudSyncState({
          firebaseAuthVerified: true,
          firebaseAuthEmail: resolvedEmail,
          error: null,
        });
        await publishCurrentConfigToCloud().catch(() => {});
      }
    }

    window.dispatchEvent(
      new CustomEvent('smokyzone_auth_change', {
        detail: { authenticated: true, email: resolvedEmail, userInitiated: true },
      })
    );

    addActivityLog(
      'Owner Logged In (Google)',
      `Google authentication verified (${resolvedEmail} · UID ${cred.user.uid} via ${identity.source}) on ${getDeviceInfo()}`,
      'security'
    );

    return cred.user;
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const errMsg = err instanceof Error ? err.message : String(err);
    if (code === 'auth/unauthorized-domain' || errMsg.includes('auth/unauthorized-domain')) {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'this domain';
      throw new Error(
        `auth/unauthorized-domain: Add "${host}" under Firebase Console → Authentication → Settings → Authorized domains for solid-rush-vn2tx.`
      );
    }
    if (code === 'auth/popup-closed-by-user' || errMsg.includes('auth/popup-closed-by-user')) {
      throw new Error('Google sign-in popup was closed before finishing. Please try again and select Ifeanyinuels32@gmail.com.');
    }
    if (code === 'auth/cancelled-popup-request' || errMsg.includes('auth/cancelled-popup-request')) {
      throw new Error('Another sign-in popup was already open. Please close extra popups and try again.');
    }
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/operation-not-supported-in-this-environment' ||
      errMsg.includes('auth/popup-blocked')
    ) {
      throw new Error(
        'Browser blocked the Google sign-in popup. Allow popups for this site (or open the app outside an embedded frame) and try again.'
      );
    }
    if (code === 'auth/network-request-failed' || errMsg.includes('auth/network-request-failed')) {
      throw new Error('Network error contacting Firebase Auth. Check your internet connection and try again.');
    }
    throw err;
  } finally {
    isSignInFlowActive = false;
  }
};

export const logoutOwner = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  clearUidIdentityCache();
  clearPasscodeSession();
  setVerifiedOwnerSessionCache(null);
  updateCloudSyncState({
    firebaseAuthVerified: false,
    firebaseAuthEmail: null,
  });
  window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: false } }));

  addActivityLog(
    'Owner Logged Out',
    `Signed out from ${getDeviceInfo()}`,
    'security'
  );
};

// Persistent Owner Session Guard: preserves passcode & verified Google sessions until manual logout
export const initOwnerSessionGuard = (onRevoked?: () => void): (() => void) => {
  const unsubAuth = onAuthStateChanged(auth, async (user) => {
    markFirebaseAuthInitialized();
    const hasPasscode = hasActivePasscodeSession();

    if (isSignInFlowActive) return;

    if (!user) {
      clearUidIdentityCache();
      updateCloudSyncState({
        firebaseAuthVerified: false,
        firebaseAuthEmail: null,
      });

      // Preserve active passcode login even when Firebase Auth user is null!
      if (hasPasscode) {
        setVerifiedOwnerSessionCache(OWNER_EMAIL);
        window.dispatchEvent(
          new CustomEvent('smokyzone_auth_change', { detail: { authenticated: true, email: OWNER_EMAIL } })
        );
        return;
      }

      setVerifiedOwnerSessionCache(null);
      window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: false } }));
      onRevoked?.();
      return;
    }

    const identity = await resolveFirebaseUserIdentity(user);
    const email = identity.email;

    console.debug('[SmokyZone Auth] initOwnerSessionGuard onAuthStateChanged:', {
      uid: user.uid,
      email,
      emailVerified: identity.emailVerified,
      source: identity.source,
      hasTokenEmailClaim: identity.hasTokenEmailClaim,
      hasPasscode,
      isSignInFlowActive,
      hasUser: true,
    });

    if (!isVerifiedOwnerEmail(email) || !identity.emailVerified) {
      console.warn('[SmokyZone Auth] Revoking unauthorized/unverified Google session:', {
        uid: user.uid,
        email,
        emailVerified: identity.emailVerified,
        hasTokenEmailClaim: identity.hasTokenEmailClaim,
      });
      clearUidIdentityCache(user.uid);
      try {
        await signOut(auth);
      } catch {
        // ignore
      }
      updateCloudSyncState({
        firebaseAuthVerified: false,
        firebaseAuthEmail: null,
      });
      if (!hasPasscode) {
        setVerifiedOwnerSessionCache(null);
        window.dispatchEvent(new CustomEvent('smokyzone_auth_change', { detail: { authenticated: false } }));
        onRevoked?.();
      }
      return;
    }

    setVerifiedOwnerSessionCache(email, user.uid);
    updateCloudSyncState({
      firebaseAuthVerified: true,
      firebaseAuthEmail: email,
      error: null,
    });
    void ensureOwnerAdminStatusDoc(getDeviceInfo())
      .then(() => publishCurrentConfigToCloud())
      .catch((err) => {
        console.warn('[SmokyZone Auth] Could not refresh system/admin_status or config on restore:', err);
      });
    window.dispatchEvent(
      new CustomEvent('smokyzone_auth_change', { detail: { authenticated: true, email } })
    );
  });

  return () => {
    unsubAuth();
  };
};

// Preserved signature without automatic idle logout so owner stays signed in until explicit Sign Out
export const initInactivityWatcher = (onTimeout: () => void): (() => void) => {
  return initOwnerSessionGuard(onTimeout);
};
