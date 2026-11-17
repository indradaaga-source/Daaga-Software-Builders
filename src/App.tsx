import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { StudioProvider, useStudio } from './context/StudioContext';
import { StudioHeader } from './components/StudioHeader';
import { StudioHero } from './components/StudioHero';
import { PackagesCatalog } from './components/PackagesCatalog';
import { SelectedWorkSection } from './components/SelectedWorkSection';
import { OrderBuilderSection } from './components/OrderBuilderSection';
import { TrackOrdersSection } from './components/TrackOrdersSection';
import { AdminOrdersDesk } from './components/AdminOrdersDesk';
import { StudioFooter } from './components/StudioFooter';
import { StudioToastContainer } from './components/StudioToastContainer';
import { PaidOrdersApp } from './PaidOrdersApp';

const StudioAppContent: React.FC = () => {
  const { activeSection, setActiveSection, setLatestSubmittedOrder } = useStudio();

  const isPaidOrdersRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/paid-orders') ||
      new URLSearchParams(window.location.search).get('page') === 'paid-orders');

  if (isPaidOrdersRoute) {
    return <PaidOrdersApp />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F8FB] text-[#0B1D3A]">
      <StudioHeader />

      <main className="flex-1">
        {activeSection === 'overview' && (
          <>
            <StudioHero />
            <PackagesCatalog />
            <SelectedWorkSection />

            {/* Final Conversion Band */}
            <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              <div className="bg-[#0B1D3A] text-white rounded-xl p-8 sm:p-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
                    Ready to describe your website?
                  </h2>
                  <p className="text-sm sm:text-base text-[#CBD5E1]">
                    Tell us in your own words what website you need. Basic website is ₹699, and high-end web app is ₹1,399 maximum.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLatestSubmittedOrder(null);
                    setActiveSection('order-builder');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-white hover:bg-[#EDF2F8] text-[#0B1D3A] text-sm font-semibold rounded-lg transition-smooth whitespace-nowrap shrink-0 self-start md:self-auto min-h-[44px]"
                >
                  Describe Your Website
                </button>
              </div>
            </section>
          </>
        )}

        {activeSection === 'order-builder' && <OrderBuilderSection />}

        {activeSection === 'track-order' && <TrackOrdersSection />}

        {activeSection === 'admin-desk' && <AdminOrdersDesk />}
      </main>

      <StudioFooter />
      <StudioToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <StudioProvider>
          <StudioAppContent />
        </StudioProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
