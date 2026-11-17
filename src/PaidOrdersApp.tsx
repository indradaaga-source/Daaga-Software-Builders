import React, { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  LogIn,
  LogOut,
  MessageCircle,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { ORDER_STATUS_META } from './data/softwareCatalog';
import { useStudio } from './context/StudioContext';
import { useAuth, STUDIO_ADMIN_EMAIL } from './context/AuthContext';
import { StudioToastContainer } from './components/StudioToastContainer';
import { ProjectOrderStatus, SoftwareOrder } from './types/softwareBuilder';

const FALLBACK_PAID_ORDERS_URL =
  'https://ais-dev-u7ihcezegpinatghukjrne-853469935535.asia-northeast1.run.app/paid-orders';

const STATUS_OPTIONS: ProjectOrderStatus[] = [
  'received',
  'scoping',
  'in_development',
  'qa_staging',
  'delivered',
];

const PAYMENT_METHOD_LABEL: Record<SoftwareOrder['paymentPreference'], string> = {
  milestone_upi_bank: 'UPI / GPay / PhonePe',
  corporate_invoice: 'Bank Transfer / NEFT',
  card_checkout: 'Debit / Credit Card',
};

function cleanWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export const PaidOrdersApp: React.FC = () => {
  const { orders, paidOrders, formatRupees, updateOrderAdmin, showToast } = useStudio();
  const { user, isAdminUser, isSigningIn, signInWithGoogle, signOut } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [planFilter, setPlanFilter] = useState<'all' | '699' | '1399'>('all');
  const [stageFilter, setStageFilter] = useState<'all' | 'pending-action' | 'building' | 'live'>(
    'all'
  );
  const [copiedPortalUrl, setCopiedPortalUrl] = useState(false);

  const [statusDrafts, setStatusDrafts] = useState<Record<string, ProjectOrderStatus>>({});
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const unpaidCount = Math.max(0, orders.length - paidOrders.length);

  const totalCollected = useMemo(
    () => paidOrders.reduce((sum, o) => sum + (o.paidAmount || 0), 0),
    [paidOrders]
  );

  const needsStartCount = useMemo(
    () => paidOrders.filter((o) => o.status === 'received' || o.status === 'scoping').length,
    [paidOrders]
  );

  const deliveredCount = useMemo(
    () => paidOrders.filter((o) => o.status === 'delivered').length,
    [paidOrders]
  );

  const filteredPaidOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return paidOrders.filter((order) => {
      if (planFilter === '699' && order.paidAmount !== 699) return false;
      if (planFilter === '1399' && order.paidAmount !== 1399) return false;

      if (stageFilter === 'pending-action' && order.status !== 'received' && order.status !== 'scoping') {
        return false;
      }
      if (
        stageFilter === 'building' &&
        order.status !== 'in_development' &&
        order.status !== 'qa_staging'
      ) {
        return false;
      }
      if (stageFilter === 'live' && order.status !== 'delivered') {
        return false;
      }

      if (!q) return true;
      return (
        order.orderNumber.toLowerCase().includes(q) ||
        order.clientName.toLowerCase().includes(q) ||
        order.clientEmail.toLowerCase().includes(q) ||
        order.clientPhone.toLowerCase().includes(q) ||
        order.projectTitle.toLowerCase().includes(q) ||
        order.paymentRef.toLowerCase().includes(q)
      );
    });
  }, [paidOrders, planFilter, stageFilter, searchQuery]);

  const handleCopyPortalLink = async () => {
    const portalUrl =
      typeof window !== 'undefined' && window.location.origin
        ? `${window.location.origin}/paid-orders`
        : FALLBACK_PAID_ORDERS_URL;
    try {
      await navigator.clipboard.writeText(portalUrl);
      setCopiedPortalUrl(true);
      showToast('Paid Orders portal link copied', portalUrl);
      setTimeout(() => setCopiedPortalUrl(false), 2400);
    } catch {
      showToast('Paid Orders Portal URL', portalUrl);
    }
  };

  const handleSaveOrderUpdate = async (order: SoftwareOrder) => {
    setSavingId(order.id);
    try {
      const nextStatus = statusDrafts[order.id] ?? order.status;
      const nextNote = noteDrafts[order.id] ?? order.studioNote;
      await updateOrderAdmin(order.id, {
        status: nextStatus,
        studioNote: nextNote,
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FB] text-[#0B1D3A]">
      {/* Strictly 3-Zone Header */}
      <header className="sticky top-0 z-40 bg-[#0B1D3A] text-white border-b border-[#1E3A6E]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Single Wordmark */}
          <a
            href="/paid-orders"
            className="font-display text-lg sm:text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            Daaga Paid Orders
          </a>

          {/* Zone 2: Clean Single-Line Navigation */}
          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#BFDBFE]">
            <button
              onClick={() => setStageFilter('all')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
                stageFilter === 'all'
                  ? 'border-white text-white'
                  : 'border-transparent hover:text-white'
              }`}
            >
              All Paid ({paidOrders.length})
            </button>
            <button
              onClick={() => setStageFilter('pending-action')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
                stageFilter === 'pending-action'
                  ? 'border-white text-white'
                  : 'border-transparent hover:text-white'
              }`}
            >
              New Paid ({needsStartCount})
            </button>
            <button
              onClick={() => setStageFilter('building')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
                stageFilter === 'building'
                  ? 'border-white text-white'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Building
            </button>
            <button
              onClick={() => setStageFilter('live')}
              className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
                stageFilter === 'live'
                  ? 'border-white text-white'
                  : 'border-transparent hover:text-white'
              }`}
            >
              Live ({deliveredCount})
            </button>
            <a
              href="/"
              className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-white inline-flex items-center gap-1"
            >
              <span>Customer Site</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleCopyPortalLink}
              className="px-4 py-2 bg-white hover:bg-[#EFF5FF] text-[#0B1D3A] text-xs sm:text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              {copiedPortalUrl ? (
                <Check className="w-4 h-4 text-[#15803D]" />
              ) : (
                <Copy className="w-4 h-4 text-[#1E40AF]" />
              )}
              <span>{copiedPortalUrl ? 'Portal Link Copied' : 'Copy Portal Link'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        {/* Title & Owner Cloud Sign-In Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D7E2F0] pb-6">
          <div className="space-y-1.5">
            <p className="text-xs font-mono font-semibold text-[#1E40AF]">
              VERIFIED PAID ORDERS RECEIVER · WEB APPS ONLY
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]">
              Customer orders that are paid &amp; ready
            </h1>
            <p className="text-sm sm:text-base text-[#3E5270]">
              Only customers who placed an order and paid ₹699 or ₹1,399 appear here with their payment reference, contact info, and full website description.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            {user ? (
              <div className="flex items-center gap-3 bg-white border border-[#D7E2F0] rounded-lg px-3.5 py-2">
                <div className="text-xs">
                  <div className="font-semibold text-[#0B1D3A] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                    <span>{isAdminUser ? 'Owner Live Sync Active' : user.email}</span>
                  </div>
                  {!isAdminUser && (
                    <div className="text-[11px] text-[#4E6487]">
                      Sign in as {STUDIO_ADMIN_EMAIL} to receive all customers&apos; cloud orders
                    </div>
                  )}
                </div>
                <button
                  onClick={() => signOut()}
                  className="px-2.5 py-1.5 border border-[#CBD8E8] bg-[#F6F8FB] hover:bg-[#EDF2F8] rounded text-xs font-medium text-[#0B1D3A] inline-flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => signInWithGoogle().catch(() => {})}
                disabled={isSigningIn}
                className="px-4 py-2.5 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2 whitespace-nowrap"
              >
                <LogIn className="w-4 h-4" />
                <span>{isSigningIn ? 'Connecting...' : 'Owner Google Sign-In (Live Sync)'}</span>
              </button>
            )}
          </div>
        </div>

        {/* 4-Column Quantitative Revenue & Paid Orders Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 border border-[#D7E2F0] rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-5 border-r border-b lg:border-b-0 border-[#D7E2F0]">
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
              {formatRupees(totalCollected)}
            </div>
            <div className="text-xs sm:text-sm text-[#3E5270] mt-1">Total Paid Amount Received</div>
          </div>

          <div className="px-6 py-5 lg:border-r border-b lg:border-b-0 border-[#D7E2F0]">
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
              {paidOrders.length}
            </div>
            <div className="text-xs sm:text-sm text-[#3E5270] mt-1">Paid Orders Confirmed</div>
          </div>

          <div className="px-6 py-5 border-r border-[#D7E2F0]">
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#1E40AF]">
              {needsStartCount}
            </div>
            <div className="text-xs sm:text-sm text-[#3E5270] mt-1">Waiting to Start / Plan</div>
          </div>

          <div className="px-6 py-5">
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
              {deliveredCount}
            </div>
            <div className="text-xs sm:text-sm text-[#3E5270] mt-1">Paid Websites Delivered</div>
          </div>
        </div>

        {/* Search & Plan Filter Controls */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#4E6487] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search paid orders by customer name, order #, UTR ref, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#E8EEF6] rounded-lg w-fit">
            <button
              onClick={() => setPlanFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                planFilter === 'all' ? 'bg-white text-[#0B1D3A] shadow-sm' : 'text-[#3E5270]'
              }`}
            >
              All Plans
            </button>
            <button
              onClick={() => setPlanFilter('699')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                planFilter === '699' ? 'bg-white text-[#0B1D3A] shadow-sm' : 'text-[#3E5270]'
              }`}
            >
              Basic (₹699)
            </button>
            <button
              onClick={() => setPlanFilter('1399')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
                planFilter === '1399' ? 'bg-white text-[#0B1D3A] shadow-sm' : 'text-[#3E5270]'
              }`}
            >
              High-End (₹1,399)
            </button>
          </div>
        </div>

        {/* Paid Orders List */}
        <div className="space-y-5">
          {filteredPaidOrders.map((order) => {
            const currentDraftStatus = statusDrafts[order.id] ?? order.status;
            const currentDraftNote = noteDrafts[order.id] ?? order.studioNote;
            const waDigits = order.clientPhone ? cleanWhatsAppDigits(order.clientPhone) : '';

            return (
              <article
                key={order.id}
                className="bg-white border border-[#D7E2F0] rounded-xl p-6 sm:p-7 space-y-5"
              >
                {/* Top Metadata + Paid Amount */}
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 border-b border-[#EDF2F7] pb-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E6487]">
                      <span className="font-mono font-semibold text-[#1E40AF]">
                        {order.orderNumber}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{order.createdAtLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-[#15803D]">PAID</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[#0B1D3A]">
                        Ref: {order.paymentRef || 'Verified'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{PAYMENT_METHOD_LABEL[order.paymentPreference]}</span>
                    </div>

                    <h2 className="font-display text-xl sm:text-2xl font-bold text-[#0B1D3A]">
                      {order.projectTitle}
                    </h2>

                    <div className="text-xs text-[#3E5270]">
                      {order.packageTitle} · {order.addonsSummary}
                    </div>
                  </div>

                  <div className="text-left lg:text-right shrink-0">
                    <div className="text-xs text-[#4E6487]">Amount Paid</div>
                    <div className="font-mono tabular-nums text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
                      {formatRupees(order.paidAmount)}
                    </div>
                    <div className="text-xs font-medium text-[#1E40AF]">
                      {ORDER_STATUS_META[order.status].label}
                    </div>
                  </div>
                </div>

                {/* Customer Details & Website Description */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-4 p-4 rounded-lg bg-[#F6F8FB] border border-[#D7E2F0] space-y-2 text-xs">
                    <div className="font-semibold text-[#0B1D3A]">Customer Contact</div>
                    <div className="text-sm font-bold text-[#0B1D3A]">{order.clientName}</div>
                    {order.companyName && (
                      <div className="text-[#3E5270]">Shop / Org: {order.companyName}</div>
                    )}
                    <div className="text-[#3E5270]">Email: {order.clientEmail}</div>
                    {order.clientPhone && (
                      <div className="text-[#3E5270]">Phone: {order.clientPhone}</div>
                    )}
                    <div className="text-[#4E6487]">Best Time: {order.kickoffSlot}</div>

                    {waDigits.length >= 10 && (
                      <a
                        href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
                          `Hi ${order.clientName}, we received your paid web app order ${order.orderNumber} (₹${order.paidAmount}) at Daaga Software Builders!`
                        )}`}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#CBD8E8] hover:bg-[#EFF5FF] rounded-md text-xs font-semibold text-[#1E40AF]"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Message on WhatsApp</span>
                      </a>
                    )}
                  </div>

                  <div className="lg:col-span-8 space-y-2">
                    <div className="text-xs font-semibold text-[#0B1D3A]">
                      Exact Website Description from Customer
                    </div>
                    <p className="text-sm text-[#1E3354] leading-relaxed whitespace-pre-wrap">
                      {order.projectBrief}
                    </p>
                    {order.referenceUrl && (
                      <div className="text-xs text-[#4E6487] pt-1">
                        Reference Link:{' '}
                        <a
                          href={order.referenceUrl}
                          className="text-[#1E40AF] underline break-all"
                        >
                          {order.referenceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Owner Fulfillment Controls */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-4 border-t border-[#EDF2F7]">
                  <div className="lg:col-span-3">
                    <label className="block text-xs font-semibold text-[#0B1D3A] mb-1">
                      Build Progress
                    </label>
                    <select
                      value={currentDraftStatus}
                      onChange={(e) =>
                        setStatusDrafts((prev) => ({
                          ...prev,
                          [order.id]: e.target.value as ProjectOrderStatus,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A]"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {ORDER_STATUS_META[st].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="lg:col-span-7">
                    <label className="block text-xs font-semibold text-[#0B1D3A] mb-1">
                      Preview Link or Update Note for Customer
                    </label>
                    <input
                      type="text"
                      value={currentDraftNote}
                      onChange={(e) =>
                        setNoteDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                      }
                      placeholder="Add build update or preview URL for the customer..."
                      maxLength={600}
                      className="w-full px-3.5 py-2 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A]"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <button
                      onClick={() => handleSaveOrderUpdate(order)}
                      disabled={savingId === order.id}
                      className="w-full px-4 py-2 bg-[#0B1D3A] hover:bg-[#152E58] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg transition-smooth min-h-[40px]"
                    >
                      {savingId === order.id ? 'Saving...' : 'Update Order'}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredPaidOrders.length === 0 && (
            <div className="bg-white border border-[#D7E2F0] rounded-xl p-10 text-center space-y-2">
              <div className="text-base font-semibold text-[#0B1D3A]">
                No paid orders match this filter yet
              </div>
              <p className="text-xs text-[#4E6487]">
                When a customer orders and pays ₹699 or ₹1,399 on the customer website, their order appears here automatically.
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-[#D7E2F0] bg-white mt-auto">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#4E6487]">
          <div>
            Daaga Paid Orders Portal · Showing only paid web app orders ({unpaidCount} unpaid inquiry hidden)
          </div>
          <div className="flex items-center gap-5">
            <a href="/" className="text-[#1E40AF] hover:text-[#0B1D3A] font-semibold">
              Open Customer Order Website
            </a>
            <a href="/?tab=track" className="hover:text-[#0B1D3A]">
              Customer Order Tracker
            </a>
          </div>
        </div>
      </footer>

      <StudioToastContainer />
    </div>
  );
};
