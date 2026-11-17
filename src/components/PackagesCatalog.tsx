import React from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { SOFTWARE_PACKAGES } from '../data/softwareCatalog';
import { ServiceCategory } from '../types/softwareBuilder';
import { useStudio } from '../context/StudioContext';

const CATEGORY_TABS: Array<{ id: ServiceCategory; label: string }> = [
  { id: 'all', label: 'All Web Apps' },
  { id: 'basic-699', label: 'Basic Website (₹699)' },
  { id: 'high-end-1399', label: 'High-End Web App (₹1,399 Max)' },
];

export const PackagesCatalog: React.FC = () => {
  const {
    selectedCategory,
    setSelectedCategory,
    formatRupees,
    selectPackageAndDescribe,
  } = useStudio();

  const filteredPackages =
    selectedCategory === 'all'
      ? SOFTWARE_PACKAGES
      : SOFTWARE_PACKAGES.filter((pkg) => pkg.category === selectedCategory);

  return (
    <section
      id="services-catalog"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 space-y-8"
    >
      {/* Section Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-[#D7E2F0] pb-6">
        <div className="space-y-2 max-w-2xl">
          <h2
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]"
            style={{ textWrap: 'balance' }}
          >
            Simple web app plans in Rupees
          </h2>
          <p className="text-sm sm:text-base text-[#3E5270]">
            No confusing jargon and no hidden fees. Choose ₹699 for a basic website or ₹1,399 (maximum price) for a high-end web app, then describe exactly what you want.
          </p>
        </div>

        <div className="text-xs sm:text-sm font-medium text-[#1E40AF] self-start lg:self-auto whitespace-nowrap">
          Web Apps Only · Maximum Price ₹1,399
        </div>
      </div>

      {/* Category Segmented Filter Bar */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#E8EEF6] rounded-lg w-fit max-w-full">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedCategory(tab.id)}
            className={`px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md transition-smooth whitespace-nowrap shrink-0 ${
              selectedCategory === tab.id
                ? 'bg-white text-[#0B1D3A] shadow-sm'
                : 'text-[#3E5270] hover:text-[#0B1D3A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Clean 2-Column Web App Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredPackages.map((pkg) => (
          <article
            key={pkg.id}
            className="bg-white border border-[#D7E2F0] rounded-xl p-6 sm:p-7 flex flex-col justify-between gap-6"
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E6487]">
                <span className="font-mono tabular-nums font-medium text-[#1E40AF]">
                  {pkg.indexLabel}. {pkg.deliveryDays}
                </span>
                <span aria-hidden="true">·</span>
                <span>{pkg.includesSummary}</span>
              </div>

              <div>
                <h3 className="font-display text-xl sm:text-2xl font-bold text-[#0B1D3A]">
                  {pkg.title}
                </h3>
                <p className="text-sm font-medium text-[#1E40AF] mt-1">{pkg.tagline}</p>
              </div>

              <p className="text-sm text-[#3E5270] leading-relaxed">{pkg.description}</p>

              <ul className="space-y-2 pt-2 border-t border-[#EDF2F7]">
                {pkg.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-[#1E3354]"
                  >
                    <Check className="w-4 h-4 text-[#1D4ED8] shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-5 border-t border-[#D7E2F0] flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-[#4E6487]">
                  {pkg.priceInr === 699 ? 'Fixed Basic Price' : 'Max High-End Price'}
                </div>
                <div className="font-mono tabular-nums text-xl sm:text-2xl font-semibold text-[#0B1D3A]">
                  {formatRupees(pkg.priceInr)}
                </div>
              </div>

              <button
                onClick={() => selectPackageAndDescribe(pkg.id)}
                className="px-4 py-2.5 bg-[#0B1D3A] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[44px]"
              >
                <span>Describe &amp; Order</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
