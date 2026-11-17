import React, { useState } from 'react';
import { ArrowRight, Layers } from 'lucide-react';
import { SELECTED_CASE_STUDIES } from '../data/softwareCatalog';
import { useStudio } from '../context/StudioContext';

export const SelectedWorkSection: React.FC = () => {
  const { setActiveSection, setLatestSubmittedOrder } = useStudio();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  return (
    <section
      id="selected-work"
      className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16 border-t border-[#D7E2F0] space-y-10"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <h2
            className="font-display text-2xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]"
            style={{ textWrap: 'balance' }}
          >
            Web apps we recently built
          </h2>
          <p className="text-sm sm:text-base text-[#3E5270]">
            Real websites and web apps made for Indian shops, clinics, and coaching classes — easy to open on any phone and simple to use.
          </p>
        </div>

        <button
          onClick={() => {
            setLatestSubmittedOrder(null);
            setActiveSection('order-builder');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="text-sm font-semibold text-[#1E40AF] hover:text-[#0B1D3A] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          <span>Describe a website like this</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
        {SELECTED_CASE_STUDIES.map((study) => (
          <article
            key={study.id}
            className="bg-white border border-[#D7E2F0] rounded-xl overflow-hidden flex flex-col justify-between"
          >
            <div>
              <div className="aspect-[4/3] w-full bg-[#E8EEF6] overflow-hidden border-b border-[#D7E2F0]">
                {!failedImages[study.id] ? (
                  <img
                    src={study.image}
                    alt={study.imageAlt}
                    referrerPolicy="no-referrer"
                    onError={() => setFailedImages((prev) => ({ ...prev, [study.id]: true }))}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#0B1D3A] to-[#1E3A6E] text-white">
                    <Layers className="w-8 h-8 text-[#93C5FD] mb-2" />
                    <div className="text-sm font-semibold">{study.client}</div>
                  </div>
                )}
              </div>

              <div className="p-6 space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#4E6487]">
                  <span>{study.client}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.sector}</span>
                  <span aria-hidden="true">·</span>
                  <span>{study.timeframe}</span>
                </div>

                <h3 className="font-display text-lg sm:text-xl font-bold text-[#0B1D3A] leading-snug">
                  {study.title}
                </h3>

                <p className="text-sm text-[#3E5270] leading-relaxed">{study.summary}</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-[#F6F8FB] border-t border-[#D7E2F0] space-y-1">
              <div className="font-mono tabular-nums text-xs sm:text-sm font-semibold text-[#1E40AF]">
                {study.outcomeMetric}
              </div>
              <div className="text-xs text-[#4E6487]">{study.stack}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
