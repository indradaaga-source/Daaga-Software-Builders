import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import type {
  CurrencyCode,
  EngagementModel,
  PaymentPreference,
  PaymentStatus,
  ProjectOrderStatus,
  SoftwareOrder,
  TimelineWindow,
} from '../types/softwareBuilder';

export const STUDIO_ADMIN_EMAIL = 'yashpillalamarri2013@gmail.com';

export interface CloudUserProfile {
  uid: string;
  displayName: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  referralCode?: string;
}

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  isSigningIn: boolean;
  isAdminUser: boolean;
  cloudProfile: CloudUserProfile | null;
  signInWithGoogle: () => Promise<User | null>;
  signOut: () => Promise<void>;
  submitSoftwareOrderToFirestore: (
    order: Omit<SoftwareOrder, 'userId' | 'createdAtLabel' | 'source'>
  ) => Promise<void>;
  updateOrderBriefInFirestore: (
    orderId: string,
    payload: { projectBrief: string; referenceUrl: string; kickoffSlot: string }
  ) => Promise<void>;
  markOrderPaidInFirestore: (
    orderId: string,
    payload: { paidAmount: number; paymentRef: string; paymentPreference: PaymentPreference }
  ) => Promise<void>;
  updateOrderAdminInFirestore: (
    orderId: string,
    payload: { status: ProjectOrderStatus; studioNote: string }
  ) => Promise<void>;
  subscribeToSoftwareOrders: (onData: (orders: SoftwareOrder[]) => void) => Unsubscribe;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 128) || `dsb-${Date.now()}`;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [cloudProfile, setCloudProfile] = useState<CloudUserProfile | null>(null);

  const isAdminUser = Boolean(
    user?.email && user.email.toLowerCase() === STUDIO_ADMIN_EMAIL && user.emailVerified
  );

  const ensureUserDocs = useCallback(async (u: User) => {
    const publicPath = `users/${u.uid}`;
    const privatePath = `users/${u.uid}/private/info`;

    try {
      const publicRef = doc(db, 'users', u.uid);
      const existingPublic = await getDoc(publicRef);

      if (!existingPublic.exists()) {
        const displayName = (u.displayName || u.email?.split('@')[0] || 'Client').slice(0, 100);
        const newProfile = {
          uid: u.uid,
          displayName,
          points: 0,
          tier: 'bronze' as const,
          referralCode: `DSB-${u.uid.slice(0, 6).toUpperCase()}`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(publicRef, newProfile);
        setCloudProfile({
          uid: u.uid,
          displayName,
          points: 0,
          tier: 'bronze',
          referralCode: newProfile.referralCode,
        });
      } else {
        const data = existingPublic.data();
        setCloudProfile({
          uid: String(data.uid || u.uid),
          displayName: String(data.displayName || 'Client'),
          points: Number(data.points || 0),
          tier: (data.tier as CloudUserProfile['tier']) || 'bronze',
          referralCode: data.referralCode ? String(data.referralCode) : undefined,
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, publicPath);
    }

    try {
      const privateRef = doc(db, 'users', u.uid, 'private', 'info');
      const existingPrivate = await getDoc(privateRef);
      if (!existingPrivate.exists() && u.email) {
        await setDoc(privateRef, {
          uid: u.uid,
          email: u.email.slice(0, 200),
          phone: '',
          defaultAddress: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (firebaseUser) {
        ensureUserDocs(firebaseUser).catch((err) => {
          console.error('Failed syncing user profile to Firestore:', err);
        });
      } else {
        setCloudProfile(null);
      }
    });
    return () => unsubscribe();
  }, [ensureUserDocs]);

  const signInWithGoogle = async (): Promise<User | null> => {
    setIsSigningIn(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      return cred.user;
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const submitSoftwareOrderToFirestore = async (
    order: Omit<SoftwareOrder, 'userId' | 'createdAtLabel' | 'source'>
  ) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const safeId = sanitizeId(order.id);
    const path = `projectOrders/${safeId}`;
    const safeOrderNumber = /^DSB-[0-9]{4}-[0-9]{4}$/.test(order.orderNumber)
      ? order.orderNumber
      : `DSB-2026-${String(Math.floor(1000 + Math.random() * 9000))}`;

    const clientName = order.clientName.trim().slice(0, 100);
    const clientEmail = order.clientEmail.trim().slice(0, 200);
    const projectTitle = order.projectTitle.trim().slice(0, 160);
    const projectBrief = order.projectBrief.trim().slice(0, 2500);
    const safeTotal = Math.max(0, Math.min(1399, Math.round(Number(order.estimatedTotal) || 699)));
    const isPaid = order.paymentStatus === 'paid';
    const safeRef = order.paymentRef.trim().slice(0, 100);

    try {
      await setDoc(doc(db, 'projectOrders', safeId), {
        id: safeId,
        userId: currentUser.uid,
        orderNumber: safeOrderNumber,
        clientName: clientName.length >= 2 ? clientName : 'Client',
        clientEmail:
          clientEmail.length >= 3 ? clientEmail : currentUser.email || 'client@daagasoftware.in',
        clientPhone: order.clientPhone.trim().slice(0, 30),
        companyName: order.companyName.trim().slice(0, 120),
        projectTitle: projectTitle.length >= 2 ? projectTitle : 'Web App Build Order',
        packageId: order.packageId.trim().slice(0, 80),
        packageTitle: order.packageTitle.trim().slice(0, 160),
        addonsSummary: order.addonsSummary.trim().slice(0, 600),
        timelineWindow: order.timelineWindow,
        engagementModel: order.engagementModel,
        currency: order.currency,
        estimatedTotal: safeTotal,
        paymentPreference: order.paymentPreference,
        paymentStatus: isPaid ? 'paid' : 'unpaid',
        paidAmount: isPaid ? safeTotal : 0,
        paymentRef: isPaid ? (safeRef.length >= 3 ? safeRef : `UPI-${safeOrderNumber}`) : '',
        projectBrief:
          projectBrief.length >= 10
            ? projectBrief
            : `${projectBrief} - Web app brief submitted via Daaga Software Builders.`,
        referenceUrl: order.referenceUrl.trim().slice(0, 300),
        kickoffSlot: (order.kickoffSlot.trim() || 'Morning (10 AM – 1 PM)').slice(0, 100),
        status: 'received',
        studioNote: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, path);
    }
  };

  const updateOrderBriefInFirestore = async (
    orderId: string,
    payload: { projectBrief: string; referenceUrl: string; kickoffSlot: string }
  ) => {
    if (!auth.currentUser) return;
    const safeId = sanitizeId(orderId);
    const path = `projectOrders/${safeId}`;
    const trimmedBrief = payload.projectBrief.trim().slice(0, 2500);

    try {
      await updateDoc(doc(db, 'projectOrders', safeId), {
        projectBrief: trimmedBrief.length >= 10 ? trimmedBrief : `${trimmedBrief} (updated scope)`,
        referenceUrl: payload.referenceUrl.trim().slice(0, 300),
        kickoffSlot: (payload.kickoffSlot.trim() || 'Morning (10 AM – 1 PM)').slice(0, 100),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const markOrderPaidInFirestore = async (
    orderId: string,
    payload: { paidAmount: number; paymentRef: string; paymentPreference: PaymentPreference }
  ) => {
    if (!auth.currentUser) return;
    const safeId = sanitizeId(orderId);
    const path = `projectOrders/${safeId}`;
    const safeRef = payload.paymentRef.trim().slice(0, 100);

    try {
      await updateDoc(doc(db, 'projectOrders', safeId), {
        paymentStatus: 'paid',
        paidAmount: Math.max(1, Math.min(1399, Math.round(payload.paidAmount))),
        paymentRef: safeRef.length >= 3 ? safeRef : `UPI-${Date.now()}`,
        paymentPreference: payload.paymentPreference,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const updateOrderAdminInFirestore = async (
    orderId: string,
    payload: { status: ProjectOrderStatus; studioNote: string }
  ) => {
    if (!auth.currentUser) return;
    const safeId = sanitizeId(orderId);
    const path = `projectOrders/${safeId}`;

    try {
      await updateDoc(doc(db, 'projectOrders', safeId), {
        status: payload.status,
        studioNote: payload.studioNote.trim().slice(0, 600),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  };

  const subscribeToSoftwareOrders = useCallback(
    (onData: (orders: SoftwareOrder[]) => void): Unsubscribe => {
      if (!authReady || !user) {
        return () => {};
      }

      const collectionPath = 'projectOrders';
      const q = isAdminUser
        ? query(collection(db, collectionPath))
        : query(collection(db, collectionPath), where('userId', '==', user.uid));

      return onSnapshot(
        q,
        (snapshot) => {
          const parsed: SoftwareOrder[] = snapshot.docs.map((d) => {
            const data = d.data();
            const createdDate =
              data.createdAt && typeof data.createdAt.toDate === 'function'
                ? data.createdAt.toDate()
                : new Date();

            const rawPaymentStatus = data.paymentStatus as PaymentStatus | undefined;
            const rawPaidAmount = Number(data.paidAmount || 0);

            return {
              id: String(data.id || d.id),
              userId: String(data.userId || ''),
              orderNumber: String(data.orderNumber || ''),
              clientName: String(data.clientName || ''),
              clientEmail: String(data.clientEmail || ''),
              clientPhone: String(data.clientPhone || ''),
              companyName: String(data.companyName || ''),
              projectTitle: String(data.projectTitle || ''),
              packageId: String(data.packageId || ''),
              packageTitle: String(data.packageTitle || ''),
              addonsSummary: String(data.addonsSummary || ''),
              timelineWindow: (data.timelineWindow as TimelineWindow) || 'standard_4_6_weeks',
              engagementModel: (data.engagementModel as EngagementModel) || 'fixed_scope',
              currency: (data.currency as CurrencyCode) || 'INR',
              estimatedTotal: Number(data.estimatedTotal || 0),
              paymentPreference:
                (data.paymentPreference as PaymentPreference) || 'milestone_upi_bank',
              paymentStatus: rawPaymentStatus === 'paid' ? 'paid' : 'unpaid',
              paidAmount: rawPaymentStatus === 'paid' ? rawPaidAmount : 0,
              paymentRef: String(data.paymentRef || ''),
              projectBrief: String(data.projectBrief || ''),
              referenceUrl: String(data.referenceUrl || ''),
              kickoffSlot: String(data.kickoffSlot || ''),
              status: (data.status as ProjectOrderStatus) || 'received',
              studioNote: String(data.studioNote || ''),
              createdAtLabel: createdDate.toLocaleDateString('en-IN', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }),
              source: 'cloud',
            };
          });
          onData(parsed);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, collectionPath);
        }
      );
    },
    [authReady, user, isAdminUser]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        isSigningIn,
        isAdminUser,
        cloudProfile,
        signInWithGoogle,
        signOut,
        submitSoftwareOrderToFirestore,
        updateOrderBriefInFirestore,
        markOrderPaidInFirestore,
        updateOrderAdminInFirestore,
        subscribeToSoftwareOrders,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
