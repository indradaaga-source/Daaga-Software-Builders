import React, { useEffect, useState } from 'react';
import { Check, LogIn, Search } from 'lucide-react';
import { ORDER_STATUS_META } from '../data/softwareCatalog';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../context/AuthContext';
import { ProjectOrderStatus, SoftwareOrder } from '../types/softwareBuilder';

const ORDERED_STAGES: ProjectOrderStatus[] = [
  'received',
  'scoping',
  'in_development',
  'qa_staging',
  'delivered',
];

export const TrackOrdersSection: React.FC = () => {
  const {
    orders,
    findOrderByQuery,
    lookupRemoteOrder,
    updateOrderBrief,
    markOrderAsPaid,
    formatRupees,
    setActiveSection,
    setLatestSubmittedOrder,
  } = useStudio();
  const { user, signInWithGoogle, isSigningIn } = useAuth();

  const [lookupInput, setLookupInput] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('order') || '';
    }
    return '';
  });

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => orders[0]?.id || '');
  const [editingBrief, setEditingBrief] = useState(false);
  const [briefDraft, setBriefDraft] = useState('');
  const [refDraft, setRefDraft] = useState('');
  const [slotDraft, setSlotDraft] = useState('');
  const [savingBrief, setSavingBrief] = useState(false);

  const [payRefInput, setPayRefInput] = useState('');
  const [markingPaid, setMarkingPaid] = useState(false);

  useEffect(() => {
    const clean = lookupInput.trim();
    if (!clean) return;
    const match = findOrderByQuery(clean);
    if (match) {
      setSelectedOrderId(match.id);
    } else if (clean.length >= 6) {
      void lookupRemoteOrder(clean).then((remote) => {
        if (remote) setSelectedOrderId(remote.id);
      });
    }
  }, [lookupInput, findOrderByQuery, lookupRemoteOrder]);

  const activeOrder: SoftwareOrder | undefined =
    orders.find((o) => o.id === selectedOrderId) || orders[0];

  const startEditingBrief = (order: SoftwareOrder) => {
    setBriefDraft(order.projectBrief);
    setRefDraft(order.referenceUrl);
    setSlotDraft(order.kickoffSlot);
    setEditingBrief(true);
  };

  const handleSaveBrief = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || briefDraft.trim().length < 10) return;
    setSavingBrief(true);
    try {
      await updateOrderBrief(activeOrder.id, {
        projectBrief: briefDraft.trim(),
        referenceUrl: refDraft.trim(),
        kickoffSlot: slotDraft.trim() || activeOrder.kickoffSlot,
      });
      setEditingBrief(false);
    } finally {
      setSavingBrief(false);
    }
  };

  const handlePayPendingOrder = async (order: SoftwareOrder) => {
    setMarkingPaid(true);
    try {
      await markOrderAsPaid(order.id, {
        paymentRef: payRefInput.trim() || `UPI-${order.orderNumber}`,
        paymentPreference: 'milestone_upi_bank',
      });
      setPayRefInput('');
    } finally {
      setMarkingPaid(false);
    }
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D7E2F0] pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]">
            Track your website order
          </h1>
          <p className="text-sm sm:text-base text-[#3E5270] mt-2">
            Enter your order number (like DSB-2026-4012), phone number, or email to check build progress, payment status, or edit your description.
          </p>
        </div>

        {!user && (
          <button
            onClick={() => signInWithGoogle().catch(() => {})}
            disabled={isSigningIn}
            className="px-4 py-2.5 bg-white border border-[#CBD8E8] hover:bg-[#EDF2F8] rounded-lg text-xs sm:text-sm font-semibold text-[#0B1D3A] inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start md:self-auto"
          >
            <LogIn className="w-4 h-4 text-[#1D4ED8]" />
            <span>{isSigningIn ? 'Connecting...' : 'Sign in to Sync Orders'}</span>
          </button>
        )}
      </div>

      {/* Lookup Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#4E6487] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={lookupInput}
            onChange={(e) => setLookupInput(e.target.value)}
            placeholder="Search by order number (DSB-2026-4012), phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
          />
        </div>
        <button
          onClick={() => {
            setLatestSubmittedOrder(null);
            setActiveSection('order-builder');
          }}
          className="px-5 py-2.5 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-sm font-semibold rounded-lg transition-smooth whitespace-nowrap shrink-0"
        >
          Describe New Website
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left List of Orders */}
        <div className="lg:col-span-4 space-y-3">
          <div className="text-xs font-semibold text-[#4E6487]">
            Recent Web App Orders ({orders.length})
          </div>
          {orders.map((order) => {
            const isSelected = activeOrder?.id === order.id;
            const meta = ORDER_STATUS_META[order.status];
            return (
              <button
                key={order.id}
                onClick={() => {
                  setSelectedOrderId(order.id);
                  setEditingBrief(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-smooth space-y-1.5 ${
                  isSelected
                    ? 'bg-[#0B1D3A] border-[#0B1D3A] text-white'
                    : 'bg-white border-[#D7E2F0] text-[#0B1D3A] hover:bg-[#F0F5FC]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span
                    className={`font-mono font-medium ${
                      isSelected ? 'text-[#93C5FD]' : 'text-[#1E40AF]'
                    }`}
                  >
                    {order.orderNumber}
                  </span>
                  <span className={isSelected ? 'text-[#BFDBFE]' : 'text-[#4E6487]'}>
                    {meta.label}
                  </span>
                </div>
                <div className="font-semibold text-sm truncate">{order.projectTitle}</div>
                <div
                  className={`text-xs flex items-center justify-between ${
                    isSelected ? 'text-[#BFDBFE]' : 'text-[#4E6487]'
                  }`}
                >
                  <span>
                    {order.clientName} · {order.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                  <span className="font-mono tabular-nums">
                    {formatRupees(order.estimatedTotal)}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Detail Panel */}
        <div className="lg:col-span-8">
          {activeOrder ? (
            <div className="bg-white border border-[#D7E2F0] rounded-xl p-6 sm:p-8 space-y-7">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-[#D7E2F0] pb-6">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E6487]">
                    <span className="font-mono font-semibold text-[#1E40AF]">
                      {activeOrder.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{activeOrder.createdAtLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeOrder.packageTitle}</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#0B1D3A]">
                    {activeOrder.projectTitle}
                  </h2>
                  <p className="text-sm text-[#3E5270]">
                    {activeOrder.clientName}
                    {activeOrder.companyName ? ` (${activeOrder.companyName})` : ''} ·{' '}
                    {activeOrder.clientEmail}
                  </p>
                </div>

                <div className="text-left sm:text-right shrink-0">
                  <div className="text-xs text-[#4E6487]">
                    {activeOrder.paymentStatus === 'paid' ? 'Paid Amount' : 'Amount Due'}
                  </div>
                  <div className="font-mono tabular-nums text-2xl font-bold text-[#0B1D3A]">
                    {formatRupees(activeOrder.estimatedTotal)}
                  </div>
                  <div className="text-xs font-medium text-[#1E40AF]">
                    {activeOrder.paymentStatus === 'paid'
                      ? `Paid · Ref: ${activeOrder.paymentRef}`
                      : 'Payment Pending'}
                  </div>
                </div>
              </div>

              {/* Pay Now Action if Unpaid */}
              {activeOrder.paymentStatus === 'unpaid' && activeOrder.status !== 'delivered' && (
                <div className="p-4 rounded-lg bg-[#EFF5FF] border border-[#BFDBFE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-[#0B1D3A]">
                      Complete payment ({formatRupees(activeOrder.estimatedTotal)}) to start build priority
                    </div>
                    <div className="text-xs text-[#3E5270]">
                      UPI ID: <span className="font-mono font-semibold">daagasoftware@upi</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={payRefInput}
                      onChange={(e) => setPayRefInput(e.target.value)}
                      placeholder="UTR / Ref ID"
                      maxLength={100}
                      className="px-3 py-2 rounded-lg border border-[#CBD8E8] bg-white text-xs font-mono text-[#0B1D3A]"
                    />
                    <button
                      type="button"
                      disabled={markingPaid}
                      onClick={() => handlePayPendingOrder(activeOrder)}
                      className="px-4 py-2 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-xs font-semibold rounded-lg inline-flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {markingPaid
                          ? 'Confirming...'
                          : `Confirm Payment (${formatRupees(activeOrder.estimatedTotal)})`}
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* 5-Stage Progress Stepper */}
              <div className="space-y-3">
                <div className="text-xs font-semibold text-[#0B1D3A]">
                  Current Status: {ORDER_STATUS_META[activeOrder.status].label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {ORDERED_STAGES.map((stage) => {
                    const currentStep = ORDER_STATUS_META[activeOrder.status].step;
                    const stageMeta = ORDER_STATUS_META[stage];
                    const completedOrActive = stageMeta.step <= currentStep;
                    const isCurrent = stage === activeOrder.status;

                    return (
                      <div
                        key={stage}
                        className={`p-3 rounded-lg border text-xs ${
                          isCurrent
                            ? 'bg-[#0B1D3A] border-[#0B1D3A] text-white'
                            : completedOrActive
                              ? 'bg-[#EFF5FF] border-[#BFDBFE] text-[#0B1D3A]'
                              : 'bg-[#FAFBFD] border-[#E2E8F0] text-[#64748B]'
                        }`}
                      >
                        <div className="font-mono text-[11px] opacity-80">
                          Step 0{stageMeta.step}
                        </div>
                        <div className="font-semibold mt-0.5">{stageMeta.label}</div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-[#3E5270]">
                  {ORDER_STATUS_META[activeOrder.status].summary}
                </p>
              </div>

              {activeOrder.studioNote && (
                <div className="p-4 rounded-lg bg-[#EFF5FF] border border-[#BFDBFE] space-y-1">
                  <div className="text-xs font-semibold text-[#1E40AF]">
                    Update from Daaga Team
                  </div>
                  <p className="text-sm text-[#0B1D3A]">{activeOrder.studioNote}</p>
                </div>
              )}

              {/* Plan & Contact Time Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2 border-t border-[#EDF2F7]">
                <div>
                  <div className="text-xs text-[#4E6487]">Plan Tier</div>
                  <div className="font-medium text-[#0B1D3A] mt-1">
                    {activeOrder.addonsSummary}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-[#4E6487]">Preferred Contact Time</div>
                  <div className="font-medium text-[#0B1D3A] mt-1">{activeOrder.kickoffSlot}</div>
                </div>
              </div>

              {/* Website Description View / Edit */}
              <div className="pt-4 border-t border-[#D7E2F0] space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-[#0B1D3A]">
                    What You Described
                  </div>
                  {activeOrder.status !== 'delivered' && !editingBrief && (
                    <button
                      onClick={() => startEditingBrief(activeOrder)}
                      className="text-xs font-semibold text-[#1E40AF] hover:text-[#0B1D3A] underline underline-offset-4"
                    >
                      Edit Description
                    </button>
                  )}
                </div>

                {editingBrief ? (
                  <form onSubmit={handleSaveBrief} className="space-y-3">
                    <textarea
                      rows={4}
                      value={briefDraft}
                      onChange={(e) => setBriefDraft(e.target.value)}
                      maxLength={2500}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] text-sm text-[#0B1D3A]"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="url"
                        value={refDraft}
                        onChange={(e) => setRefDraft(e.target.value)}
                        placeholder="Reference link (optional)"
                        maxLength={300}
                        className="px-3.5 py-2 rounded-lg border border-[#CBD8E8] text-sm text-[#0B1D3A]"
                      />
                      <input
                        type="text"
                        value={slotDraft}
                        onChange={(e) => setSlotDraft(e.target.value)}
                        placeholder="Preferred contact time"
                        maxLength={100}
                        className="px-3.5 py-2 rounded-lg border border-[#CBD8E8] text-sm text-[#0B1D3A]"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        disabled={savingBrief || briefDraft.trim().length < 10}
                        className="px-4 py-2 bg-[#0B1D3A] text-white text-xs font-semibold rounded-lg hover:bg-[#152E58]"
                      >
                        {savingBrief ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingBrief(false)}
                        className="px-4 py-2 border border-[#CBD8E8] text-xs font-medium rounded-lg text-[#3E5270]"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-[#3E5270] whitespace-pre-wrap leading-relaxed">
                    {activeOrder.projectBrief}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#D7E2F0] rounded-xl p-10 text-center text-sm text-[#4E6487]">
              No matching web app order found.
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
