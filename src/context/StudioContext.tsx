import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  PaymentPreference,
  PaymentStatus,
  ProjectOrderStatus,
  ServiceCategory,
  SoftwareOrder,
  WebsiteTierId,
} from '../types/softwareBuilder';
import {
  BASIC_WEBSITE_PRICE_INR,
  HIGH_END_WEBAPP_PRICE_INR,
  INITIAL_SAMPLE_ORDERS,
  MAX_WEB_APP_PRICE_INR,
  SOFTWARE_PACKAGES,
} from '../data/softwareCatalog';
import { useAuth } from './AuthContext';

export type StudioSection = 'overview' | 'order-builder' | 'track-order' | 'admin-desk';

export interface ToastNotice {
  id: string;
  message: string;
  detail?: string;
}

interface NewOrderInput {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  projectTitle: string;
  paymentPreference: PaymentPreference;
  paymentStatus: PaymentStatus;
  paymentRef: string;
  projectBrief: string;
  referenceUrl: string;
  kickoffSlot: string;
}

interface StudioContextValue {
  activeSection: StudioSection;
  setActiveSection: (section: StudioSection) => void;
  selectedCategory: ServiceCategory;
  setSelectedCategory: (cat: ServiceCategory) => void;
  formatRupees: (amount: number) => string;

  // Order Configurator State (Only Web Apps: Basic ₹699 or High-End ₹1,399 max)
  selectedPackageId: string;
  setSelectedPackageId: (pkgId: string) => void;
  selectedTier: WebsiteTierId;
  selectTier: (tier: WebsiteTierId) => void;
  selectPackageAndDescribe: (pkgId: string) => void;
  estimatedTotal: number;
  estimatedDeliveryLabel: string;

  // Orders Lifecycle
  orders: SoftwareOrder[];
  paidOrders: SoftwareOrder[];
  latestSubmittedOrder: SoftwareOrder | null;
  setLatestSubmittedOrder: (order: SoftwareOrder | null) => void;
  placeSoftwareOrder: (input: NewOrderInput) => Promise<SoftwareOrder>;
  markOrderAsPaid: (
    orderId: string,
    payload: { paymentRef: string; paymentPreference: PaymentPreference }
  ) => Promise<void>;
  updateOrderBrief: (
    orderId: string,
    payload: { projectBrief: string; referenceUrl: string; kickoffSlot: string }
  ) => Promise<void>;
  updateOrderAdmin: (
    orderId: string,
    payload: { status: ProjectOrderStatus; studioNote: string }
  ) => Promise<void>;
  findOrderByQuery: (queryText: string) => SoftwareOrder | undefined;
  lookupRemoteOrder: (queryText: string) => Promise<SoftwareOrder | null>;

  // Toast Notifications
  toasts: ToastNotice[];
  showToast: (message: string, detail?: string) => void;
  dismissToast: (id: string) => void;
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

const LOCAL_ORDERS_KEY = 'daaga_webapp_orders_v2';

export const StudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    user,
    authReady,
    isAdminUser,
    submitSoftwareOrderToFirestore,
    updateOrderBriefInFirestore,
    markOrderPaidInFirestore,
    updateOrderAdminInFirestore,
    subscribeToSoftwareOrders,
  } = useAuth();

  const [activeSection, setActiveSection] = useState<StudioSection>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab === 'order' || tab === 'order-builder' || tab === 'describe') return 'order-builder';
      if (tab === 'track' || tab === 'track-order' || params.get('order')) return 'track-order';
      if (tab === 'admin' || tab === 'admin-desk') return 'admin-desk';
    }
    return 'overview';
  });

  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('all');
  const [selectedPackageId, setSelectedPackageId] = useState<string>(SOFTWARE_PACKAGES[0].id);

  const [localOrders, setLocalOrders] = useState<SoftwareOrder[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_ORDERS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Fallback to initial sample orders
    }
    return INITIAL_SAMPLE_ORDERS;
  });

  const [cloudOrders, setCloudOrders] = useState<SoftwareOrder[]>([]);
  const [serverOrders, setServerOrders] = useState<SoftwareOrder[]>([]);
  const [latestSubmittedOrder, setLatestSubmittedOrder] = useState<SoftwareOrder | null>(null);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify(localOrders));
    } catch {
      // Ignore storage quota issues
    }
  }, [localOrders]);

  useEffect(() => {
    if (!authReady || !user) {
      setCloudOrders([]);
      return;
    }
    const unsub = subscribeToSoftwareOrders((incoming) => {
      setCloudOrders(incoming);
    });
    return () => unsub();
  }, [authReady, user, subscribeToSoftwareOrders]);

  // Also fetch Instagram/guest orders from backend when verified owner signs in
  useEffect(() => {
    if (!authReady || !user || !isAdminUser) {
      setServerOrders([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/orders/admin', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = (await res.json()) as { orders?: SoftwareOrder[] };
        if (!cancelled && Array.isArray(data.orders)) {
          setServerOrders(data.orders);
        }
      } catch {
        // Ignore network errors cleanly
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authReady, user, isAdminUser]);

  const orders = useMemo(() => {
    const byId = new Map<string, SoftwareOrder>();
    for (const o of localOrders) byId.set(o.id, o);
    for (const o of serverOrders) byId.set(o.id, o);
    for (const o of cloudOrders) byId.set(o.id, o);
    return Array.from(byId.values());
  }, [localOrders, serverOrders, cloudOrders]);

  const paidOrders = useMemo(
    () => orders.filter((o) => o.paymentStatus === 'paid' && o.paidAmount > 0),
    [orders]
  );

  const showToast = (message: string, detail?: string) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, message, detail }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const selectedPackage = useMemo(
    () => SOFTWARE_PACKAGES.find((p) => p.id === selectedPackageId) || SOFTWARE_PACKAGES[0],
    [selectedPackageId]
  );

  const selectedTier: WebsiteTierId = selectedPackage.tierId;

  const selectTier = (tier: WebsiteTierId) => {
    const firstMatching = SOFTWARE_PACKAGES.find((p) => p.tierId === tier);
    if (firstMatching) {
      setSelectedPackageId(firstMatching.id);
    }
  };

  // Hard cap: Basic is ₹699, High-End is ₹1,399 max
  const estimatedTotal = useMemo(() => {
    const raw =
      selectedTier === 'basic-website'
        ? BASIC_WEBSITE_PRICE_INR
        : HIGH_END_WEBAPP_PRICE_INR;
    return Math.min(MAX_WEB_APP_PRICE_INR, raw);
  }, [selectedTier]);

  const estimatedDeliveryLabel = selectedPackage.deliveryDays;

  const formatRupees = (amount: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);

  const selectPackageAndDescribe = (pkgId: string) => {
    setSelectedPackageId(pkgId);
    setLatestSubmittedOrder(null);
    setActiveSection('order-builder');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const placeSoftwareOrder = async (input: NewOrderInput): Promise<SoftwareOrder> => {
    const suffix = String(Math.floor(1000 + Math.random() * 9000));
    const orderNumber = `DSB-2026-${suffix}`;
    const orderId = `dsb-${Date.now()}-${suffix}`;
    const finalPrice = Math.min(MAX_WEB_APP_PRICE_INR, estimatedTotal);
    const isPaid = input.paymentStatus === 'paid';
    const cleanRef = input.paymentRef.trim();
    const resolvedRef = isPaid ? (cleanRef.length >= 3 ? cleanRef : `UPI-${orderNumber}`) : '';

    const tierSummary =
      selectedTier === 'basic-website'
        ? 'Basic Website (₹699 Fixed)'
        : 'High-End Web App (₹1,399 Max Fixed)';

    const newOrder: SoftwareOrder = {
      id: orderId,
      userId: user?.uid || 'guest-local',
      orderNumber,
      clientName: input.clientName.trim(),
      clientEmail: input.clientEmail.trim(),
      clientPhone: input.clientPhone.trim(),
      companyName: input.companyName.trim(),
      projectTitle: input.projectTitle.trim(),
      packageId: selectedPackage.id,
      packageTitle: selectedPackage.title,
      addonsSummary: tierSummary,
      timelineWindow: 'standard_4_6_weeks',
      engagementModel: 'fixed_scope',
      currency: 'INR',
      estimatedTotal: finalPrice,
      paymentPreference: input.paymentPreference,
      paymentStatus: isPaid ? 'paid' : 'unpaid',
      paidAmount: isPaid ? finalPrice : 0,
      paymentRef: resolvedRef,
      projectBrief: input.projectBrief.trim(),
      referenceUrl: input.referenceUrl.trim(),
      kickoffSlot: input.kickoffSlot.trim() || 'Morning (10 AM – 1 PM)',
      status: 'received',
      studioNote: '',
      createdAtLabel: new Date().toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      source: user ? 'cloud' : 'local',
    };

    setLocalOrders((prev) => [newOrder, ...prev]);
    setLatestSubmittedOrder(newOrder);

    // Always mirror order to live Express backend so Instagram guests without Google Sign-In still reach Paid Orders portal
    try {
      await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newOrder),
      });
    } catch {
      // Fallback already persisted locally & in Firestore when signed in
    }

    if (user) {
      await submitSoftwareOrderToFirestore({
        id: newOrder.id,
        orderNumber: newOrder.orderNumber,
        clientName: newOrder.clientName,
        clientEmail: newOrder.clientEmail,
        clientPhone: newOrder.clientPhone,
        companyName: newOrder.companyName,
        projectTitle: newOrder.projectTitle,
        packageId: newOrder.packageId,
        packageTitle: newOrder.packageTitle,
        addonsSummary: newOrder.addonsSummary,
        timelineWindow: newOrder.timelineWindow,
        engagementModel: newOrder.engagementModel,
        currency: 'INR',
        estimatedTotal: finalPrice,
        paymentPreference: newOrder.paymentPreference,
        paymentStatus: newOrder.paymentStatus,
        paidAmount: newOrder.paidAmount,
        paymentRef: newOrder.paymentRef,
        projectBrief: newOrder.projectBrief,
        referenceUrl: newOrder.referenceUrl,
        kickoffSlot: newOrder.kickoffSlot,
        status: 'received',
        studioNote: '',
      });
      showToast(
        isPaid ? `Paid Order ${newOrder.orderNumber} Confirmed!` : `Order ${newOrder.orderNumber} Placed`,
        isPaid ? `Paid ₹${finalPrice} · Sent to Daaga Paid Orders` : `Total ₹${finalPrice} · Payment pending`
      );
    } else {
      showToast(
        isPaid ? `Paid Order ${newOrder.orderNumber} Confirmed!` : `Order ${newOrder.orderNumber} Placed`,
        isPaid ? `Paid ₹${finalPrice} · Sent to Daaga Paid Orders` : `Total ₹${finalPrice} · Save your order number`
      );
    }

    return newOrder;
  };

  const markOrderAsPaid = async (
    orderId: string,
    payload: { paymentRef: string; paymentPreference: PaymentPreference }
  ) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const paidAmount = target.estimatedTotal;
    const resolvedRef = payload.paymentRef.trim() || `UPI-${target.orderNumber}`;

    setLocalOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              paymentStatus: 'paid',
              paidAmount,
              paymentRef: resolvedRef,
              paymentPreference: payload.paymentPreference,
            }
          : o
      )
    );

    try {
      await fetch(`/api/orders/${encodeURIComponent(orderId)}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: target.orderNumber,
          paymentRef: resolvedRef,
          paymentPreference: payload.paymentPreference,
        }),
      });
    } catch {
      // Ignore network fallback failure
    }

    if (user && target.source === 'cloud') {
      await markOrderPaidInFirestore(orderId, {
        paidAmount,
        paymentRef: resolvedRef,
        paymentPreference: payload.paymentPreference,
      });
    }

    showToast('Payment Recorded', `${target.orderNumber} (₹${paidAmount}) is now in Paid Orders.`);
  };

  const updateOrderBrief = async (
    orderId: string,
    payload: { projectBrief: string; referenceUrl: string; kickoffSlot: string }
  ) => {
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              projectBrief: payload.projectBrief,
              referenceUrl: payload.referenceUrl,
              kickoffSlot: payload.kickoffSlot,
            }
          : o
      )
    );

    const target = orders.find((o) => o.id === orderId);
    if (user && target?.source === 'cloud') {
      await updateOrderBriefInFirestore(orderId, payload);
    }
    showToast('Description updated', 'We have saved your latest website details.');
  };

  const updateOrderAdmin = async (
    orderId: string,
    payload: { status: ProjectOrderStatus; studioNote: string }
  ) => {
    setLocalOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: payload.status, studioNote: payload.studioNote } : o
      )
    );
    setServerOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: payload.status, studioNote: payload.studioNote } : o
      )
    );

    if (user && isAdminUser) {
      try {
        const token = await user.getIdToken();
        await fetch(`/api/orders/${encodeURIComponent(orderId)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
      } catch {
        // Ignore network error cleanly
      }
    }

    const target = orders.find((o) => o.id === orderId);
    if (user && target?.source === 'cloud') {
      await updateOrderAdminInFirestore(orderId, payload);
    }
    showToast('Order status updated', 'Customer can now see the updated progress.');
  };

  const findOrderByQuery = (queryText: string) => {
    const clean = queryText.trim().toLowerCase();
    if (!clean) return undefined;
    return orders.find(
      (o) =>
        o.orderNumber.toLowerCase() === clean ||
        o.clientEmail.toLowerCase() === clean ||
        o.clientPhone.toLowerCase().includes(clean) ||
        o.id.toLowerCase() === clean
    );
  };

  const lookupRemoteOrder = async (queryText: string): Promise<SoftwareOrder | null> => {
    const clean = queryText.trim();
    if (clean.length < 4) return null;
    try {
      const res = await fetch(`/api/orders/lookup?q=${encodeURIComponent(clean)}`);
      if (!res.ok) return null;
      const data = (await res.json()) as { order?: SoftwareOrder | null };
      if (data.order) {
        setLocalOrders((prev) => {
          if (prev.some((o) => o.id === data.order!.id)) return prev;
          return [data.order!, ...prev];
        });
        return data.order;
      }
    } catch {
      // Ignore network errors
    }
    return null;
  };

  return (
    <StudioContext.Provider
      value={{
        activeSection,
        setActiveSection,
        selectedCategory,
        setSelectedCategory,
        formatRupees,
        selectedPackageId,
        setSelectedPackageId,
        selectedTier,
        selectTier,
        selectPackageAndDescribe,
        estimatedTotal,
        estimatedDeliveryLabel,
        orders,
        paidOrders,
        latestSubmittedOrder,
        setLatestSubmittedOrder,
        placeSoftwareOrder,
        markOrderAsPaid,
        updateOrderBrief,
        updateOrderAdmin,
        findOrderByQuery,
        lookupRemoteOrder,
        toasts,
        showToast,
        dismissToast,
      }}
    >
      {children}
    </StudioContext.Provider>
  );
};

export const useStudio = () => {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error('useStudio must be used within StudioProvider');
  return ctx;
};
