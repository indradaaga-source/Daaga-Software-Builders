import React from 'react';
import { useStudio } from '../context/StudioContext';

export const StudioFooter: React.FC = () => {
  const { setActiveSection, setLatestSubmittedOrder } = useStudio();

  return (
    <footer className="border-t border-[#D7E2F0] bg-white mt-auto">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="font-display text-lg font-bold text-[#0B1D3A]">
            Daaga Software Builders
          </div>
          <p className="text-xs text-[#4E6487]">
            Web Apps Only · Basic Website ₹699 · High-End Web App ₹1,399 Max · hello@daagasoftware.in
          </p>
        </div>

        <nav className="flex flex-wrap items-center gap-6 text-xs sm:text-sm font-medium text-[#3E5270]">
          <button
            onClick={() => {
              setActiveSection('overview');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-[#0B1D3A] whitespace-nowrap"
          >
            Web Apps
          </button>
          <button
            onClick={() => {
              setLatestSubmittedOrder(null);
              setActiveSection('order-builder');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-[#0B1D3A] whitespace-nowrap"
          >
            Describe &amp; Order
          </button>
          <button
            onClick={() => {
              setActiveSection('track-order');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-[#0B1D3A] whitespace-nowrap"
          >
            Track Order
          </button>
          <button
            onClick={() => {
              setActiveSection('admin-desk');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="hover:text-[#0B1D3A] whitespace-nowrap"
          >
            Orders Desk
          </button>
          <a
            href="/paid-orders"
            className="text-[#1E40AF] hover:text-[#0B1D3A] font-semibold whitespace-nowrap"
          >
            Paid Orders Site
          </a>
        </nav>

        <div className="text-xs text-[#64748B]">
          © {new Date().getFullYear()} Daaga Software Builders. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
