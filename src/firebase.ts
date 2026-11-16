import { initializeApp, getApps, deleteApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

export const BOOTSTRAPPED_ADMIN_EMAIL = 'iamkauanalencar@gmail.com';
export const INTERNAL_AUTH_DOMAIN = 'luccacell.app';

const app = initializeApp(firebaseConfig);

const rawDbId = firebaseConfig.firestoreDatabaseId;
const isAiStudioDb = !rawDbId || rawDbId.startsWith('ai-studio-') || rawDbId === '(default)';
export const db = isAiStudioDb ? getFirestore(app) : getFirestore(app, rawDbId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export async function testFirestoreConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'settings', 'store'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Verifique a conexão do Firebase: cliente offline.');
    }
  }
}

export function normalizeLoginIdentifier(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (!clean) return '';
  if (clean.includes('@')) return clean;
  return `${clean}@${INTERNAL_AUTH_DOMAIN}`;
}

export function extractUsername(usernameOrEmail: string): string {
  const clean = usernameOrEmail.trim().toLowerCase();
  if (clean.includes('@')) {
    return clean.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
  }
  return clean.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50);
}

export function getSecondaryProvisioningAuth() {
  const name = 'SellerProvisioner';
  const existing = getApps().find((a) => a.name === name);
  const secondaryApp = existing || initializeApp(firebaseConfig, name);
  return {
    secondaryAuth: getAuth(secondaryApp),
    cleanup: async () => {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // Ignore cleanup errors if already deleted
      }
    },
  };
}

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

export function logFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn(`[Firestore Error - ${operationType} on ${path || 'unknown'}]:`, errInfo.error);
  return errInfo;
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo = logFirestoreError(error, operationType, path);
  throw new Error(JSON.stringify(errInfo));
}
