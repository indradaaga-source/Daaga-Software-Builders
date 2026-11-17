import React, { useState } from 'react';
import { LogIn, LogOut, ShieldCheck } from 'lucide-react';
import { ORDER_STATUS_META } from '../data/softwareCatalog';
import { useStudio } from '../context/StudioContext';
import { useAuth, STUDIO_ADMIN_EMAIL } from '../context/AuthContext';
import { ProjectOrderStatus, SoftwareOrder } from '../types/softwareBuilder';

const STATUS_OPTIONS: ProjectOrderStatus[] = [
  'received',
  'scoping',
  'in_development',
  'qa_staging',
  'delivered',
];

export const AdminOrdersDesk: React.FC = () => {
  const { orders, updateOrderAdmin, formatRupees } = useStudio();
  const { user, isAdminUser, isSigningIn, signInWithGoogle, signOut } = useAuth();

  const [statusFilter, setStatusFilter] = useState<'all' | ProjectOrderStatus>('all');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, ProjectOrderStatus>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const visibleOrders =
    statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter);

  const handleSaveUpdate = async (order: SoftwareOrder) => {
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
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D7E2F0] pb-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]">
            Daaga Orders Desk
          </h1>
          <p className="text-sm sm:text-base text-[#3E5270] mt-2">
            View customer website descriptions, update build progress, and share preview updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          <a
            href="/paid-orders"
            className="px-3.5 py-2 border border-[#CBD8E8] bg-white hover:bg-[#EDF2F8] rounded-lg text-xs font-semibold text-[#1E40AF] whitespace-nowrap"
          >
            Open Paid Orders Website
          </a>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <div className="font-semibold text-[#0B1D3A] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                  <span>{isAdminUser ? 'Owner Verified' : user.email}</span>
                </div>
                {!isAdminUser && (
                  <div className="text-[#4E6487]">
                    Cloud updates require {STUDIO_ADMIN_EMAIL}
                  </div>
                )}
              </div>
              <button
                onClick={() => signOut()}
                className="px-3.5 py-2 border border-[#CBD8E8] bg-white hover:bg-[#EDF2F8] rounded-lg text-xs font-medium text-[#0B1D3A] inline-flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => signInWithGoogle().catch(() => {})}
              disabled={isSigningIn}
              className="px-4 py-2.5 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-xs sm:text-sm font-semibold rounded-lg inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSigningIn ? 'Signing in...' : 'Sign In as Owner'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stage Filter Controls */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#E8EEF6] rounded-lg w-fit max-w-full">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
            statusFilter === 'all' ? 'bg-white text-[#0B1D3A] shadow-sm' : 'text-[#3E5270]'
          }`}
        >
          All Orders ({orders.length})
        </button>
        {STATUS_OPTIONS.map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-smooth ${
              statusFilter === status ? 'bg-white text-[#0B1D3A] shadow-sm' : 'text-[#3E5270]'
            }`}
          >
            {ORDER_STATUS_META[status].label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {visibleOrders.map((order) => {
          const currentDraftStatus = statusDrafts[order.id] ?? order.status;
          const currentDraftNote = noteDrafts[order.id] ?? order.studioNote;

          return (
            <div
              key={order.id}
              className="bg-white border border-[#D7E2F0] rounded-xl p-6 space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#EDF2F7] pb-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E6487]">
                    <span className="font-mono font-semibold text-[#1E40AF]">
                      {order.orderNumber}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{order.createdAtLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{order.clientName}</span>
                    {order.clientPhone && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{order.clientPhone}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>{order.clientEmail}</span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-[#0B1D3A]">
                    {order.projectTitle}
                  </h2>
                  <p className="text-xs text-[#3E5270]">
                    {order.packageTitle} · {order.addonsSummary}
                  </p>
                </div>

                <div className="font-mono tabular-nums text-lg font-bold text-[#0B1D3A] shrink-0">
                  {formatRupees(order.estimatedTotal)}
                </div>
              </div>

              <p className="text-sm text-[#3E5270] leading-relaxed">{order.projectBrief}</p>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end pt-2">
                <div className="lg:col-span-3">
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1">
                    Order Status
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
                    Note for Customer
                  </label>
                  <input
                    type="text"
                    value={currentDraftNote}
                    onChange={(e) =>
                      setNoteDrafts((prev) => ({ ...prev, [order.id]: e.target.value }))
                    }
                    placeholder="Add progress update or website preview link..."
                    maxLength={600}
                    className="w-full px-3.5 py-2 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A]"
                  />
                </div>

                <div className="lg:col-span-2">
                  <button
                    onClick={() => handleSaveUpdate(order)}
                    disabled={savingId === order.id}
                    className="w-full px-4 py-2 bg-[#0B1D3A] hover:bg-[#152E58] disabled:opacity-60 text-white text-xs sm:text-sm font-semibold rounded-lg transition-smooth min-h-[40px]"
                  >
                    {savingId === order.id ? 'Saving...' : 'Update Order'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {visibleOrders.length === 0 && (
          <div className="bg-white border border-[#D7E2F0] rounded-xl p-10 text-center text-sm text-[#4E6487]">
            No orders match this stage.
          </div>
        )}
      </div>
    </section>
  );
};
