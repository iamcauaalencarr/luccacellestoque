import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
  auth,
  BOOTSTRAPPED_ADMIN_EMAIL,
  db,
  extractUsername,
  googleProvider,
  handleFirestoreError,
  logFirestoreError,
  normalizeLoginIdentifier,
  OperationType,
} from '../firebase';
import { SCHEMA_LIMITS, type UserAccount } from '../types';

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserAccount | null;
  authReady: boolean;
  isGoogleUser: boolean;
  needsGoogleUsernameSetup: boolean;
  accessDeniedReason: 'inactive' | 'unregistered' | null;
  signInWithCredentials: (usernameOrEmail: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserAccount | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState<'inactive' | 'unregistered' | null>(
    null
  );

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      setFirebaseUser(user);

      if (!user) {
        setProfile(null);
        setAccessDeniedReason(null);
        setAuthReady(true);
        return;
      }

      setAuthReady(false);
      setAccessDeniedReason(null);

      const userRef = doc(db, 'users', user.uid);
      const directoryRef = doc(db, 'staffDirectory', user.uid);

      const isBootstrappedAdmin =
        user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified;

      let existingSnap;
      try {
        existingSnap = await getDoc(userRef);
      } catch (error) {
        logFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }

      if (existingSnap && !existingSnap.exists() && isBootstrappedAdmin) {
        const rawName = (user.displayName || '').trim().slice(0, SCHEMA_LIMITS.DISPLAY_NAME_MAX);
        const displayName = rawName.length >= SCHEMA_LIMITS.DISPLAY_NAME_MIN ? rawName : 'Administrador Lucca Cell';
        const username = extractUsername(user.email || 'admin');
        const batch = writeBatch(db);

        batch.set(userRef, {
          uid: user.uid,
          username,
          email: (user.email || BOOTSTRAPPED_ADMIN_EMAIL).slice(0, 120),
          displayName,
          role: 'admin',
          active: true,
          usernameConfirmed: false,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batch.set(directoryRef, {
          uid: user.uid,
          username,
          displayName,
          role: 'admin',
          active: true,
          createdBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        try {
          await batch.commit();
        } catch (error) {
          logFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
        }
      }

      unsubscribeProfile = onSnapshot(
        userRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            setProfile(null);
            setAccessDeniedReason('unregistered');
            setAuthReady(true);
            return;
          }

          const data = docSnap.data() as UserAccount;
          if (!data.active) {
            setProfile(data);
            setAccessDeniedReason('inactive');
          } else {
            setProfile(data);
            setAccessDeniedReason(null);
          }
          setAuthReady(true);
        },
        (error) => {
          logFirestoreError(error, OperationType.GET, `users/${user.uid}`);
          setAuthReady(true);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const signInWithCredentials = async (usernameOrEmail: string, password: string) => {
    const email = normalizeLoginIdentifier(usernameOrEmail);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const isGoogleUser = Boolean(
    firebaseUser?.providerData.some((p) => p.providerId === 'google.com')
  );
  const needsGoogleUsernameSetup = Boolean(
    authReady &&
      isGoogleUser &&
      profile &&
      profile.active &&
      !accessDeniedReason &&
      profile.usernameConfirmed !== true
  );

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        isGoogleUser,
        needsGoogleUsernameSetup,
        accessDeniedReason,
        signInWithCredentials,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return ctx;
}
