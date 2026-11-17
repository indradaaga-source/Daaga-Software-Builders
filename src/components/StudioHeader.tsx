import React, { useState } from 'react';
import { StudioSection, useStudio } from '../context/StudioContext';

export const StudioHeader: React.FC = () => {
  const { activeSection, setActiveSection, setLatestSubmittedOrder } = useStudio();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navigateTo = (section: StudioSection, anchorId?: string) => {
    if (section === 'order-builder') {
      setLatestSubmittedOrder(null);
    }
    setActiveSection(section);
    setMobileOpen(false);
    if (anchorId) {
      requestAnimationFrame(() => {
        const el = document.getElementById(anchorId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    } else if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F6F8FB]/95 backdrop-blur-sm border-b border-[#D7E2F0]">
      {/* Strictly 3 Zones separated by gap-8 */}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          onClick={() => navigateTo('overview')}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#0B1D3A] hover:text-[#1D4ED8] transition-smooth whitespace-nowrap shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8] rounded"
        >
          Daaga Software Builders
        </button>

        {/* Zone 2: 5 clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-[#3E5270]">
          <button
            onClick={() => navigateTo('overview', 'services-catalog')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
              activeSection === 'overview'
                ? 'border-[#0B1D3A] text-[#0B1D3A]'
                : 'border-transparent hover:text-[#0B1D3A]'
            }`}
          >
            Web Apps
          </button>
          <button
            onClick={() => navigateTo('order-builder')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
              activeSection === 'order-builder'
                ? 'border-[#0B1D3A] text-[#0B1D3A]'
                : 'border-transparent hover:text-[#0B1D3A]'
            }`}
          >
            Describe &amp; Order
          </button>
          <button
            onClick={() => navigateTo('overview', 'selected-work')}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-[#0B1D3A] transition-smooth"
          >
            Recent Work
          </button>
          <button
            onClick={() => navigateTo('track-order')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
              activeSection === 'track-order'
                ? 'border-[#0B1D3A] text-[#0B1D3A]'
                : 'border-transparent hover:text-[#0B1D3A]'
            }`}
          >
            Track Order
          </button>
          <button
            onClick={() => navigateTo('admin-desk')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-smooth ${
              activeSection === 'admin-desk'
                ? 'border-[#0B1D3A] text-[#0B1D3A]'
                : 'border-transparent hover:text-[#0B1D3A]'
            }`}
          >
            Orders Desk
          </button>
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigateTo('order-builder')}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0B1D3A] hover:bg-[#152E58] rounded-lg transition-smooth whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]"
          >
            Describe &amp; Order
          </button>

          <button
            onClick={() => setMobileOpen((o) => !o)}
            aria-label="Toggle navigation menu"
            className="lg:hidden p-2 rounded-lg text-[#0B1D3A] hover:bg-[#E8EEF6] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-[#D7E2F0] px-6 py-4 flex flex-col gap-2 text-sm font-medium text-[#0B1D3A]">
          <button
            onClick={() => navigateTo('overview', 'services-catalog')}
            className="text-left py-2.5 hover:text-[#1D4ED8]"
          >
            Web App Plans (₹699 – ₹1,399)
          </button>
          <button
            onClick={() => navigateTo('order-builder')}
            className="text-left py-2.5 hover:text-[#1D4ED8]"
          >
            Describe &amp; Place Order
          </button>
          <button
            onClick={() => navigateTo('overview', 'selected-work')}
            className="text-left py-2.5 hover:text-[#1D4ED8]"
          >
            Recent Work
          </button>
          <button
            onClick={() => navigateTo('track-order')}
            className="text-left py-2.5 hover:text-[#1D4ED8]"
          >
            Track Order
          </button>
          <button
            onClick={() => navigateTo('admin-desk')}
            className="text-left py-2.5 hover:text-[#1D4ED8]"
          >
            Orders Desk
          </button>
        </div>
      )}
    </header>
  );
};
