import React, { useState } from 'react';
import { ArrowRight, Code2 } from 'lucide-react';
import heroStudioImg from '../assets/images/hero_software_studio_1794912448583.jpg';
import { STUDIO_METRICS } from '../data/softwareCatalog';
import { useStudio } from '../context/StudioContext';

export const StudioHero: React.FC = () => {
  const { setActiveSection, setLatestSubmittedOrder } = useStudio();
  const [imgFailed, setImgFailed] = useState(false);

  const scrollToCatalog = () => {
    const el = document.getElementById('services-catalog');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 sm:pt-14 sm:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
        {/* Left: Proposition & Primary CTA */}
        <div className="lg:col-span-6 flex flex-col justify-between py-2 space-y-8">
          <div className="space-y-5">
            <p className="text-xs font-medium text-[#1E40AF]">
              Web Apps Only · Basic Website ₹699 · High-End Web App ₹1,399 Max
            </p>

            <h1
              className="font-display font-bold tracking-tight text-[#0B1D3A] leading-[1.08]"
              style={{
                fontSize: 'clamp(2.25rem, 4vw, 3.5rem)',
                textWrap: 'balance',
              }}
            >
              Get your own website or web app built simply — ₹699 to ₹1,399 max.
            </h1>

            <p className="text-base sm:text-lg text-[#3E5270] leading-relaxed max-w-[60ch]">
              We build only web apps and websites. Tell us in plain words what exact website you want. A basic website costs ₹699, and a full high-end web app costs ₹1,399 maximum — never more than ₹1,399.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-5 pt-2">
            <button
              onClick={() => {
                setLatestSubmittedOrder(null);
                setActiveSection('order-builder');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-6 py-3 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-2 whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <span>Describe Your Website</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={scrollToCatalog}
              className="text-sm font-semibold text-[#1E40AF] hover:text-[#0B1D3A] underline underline-offset-4 transition-smooth whitespace-nowrap shrink-0 min-h-[44px]"
            >
              See ₹699 &amp; ₹1,399 Plans
            </button>
          </div>
        </div>

        {/* Right: 16:9 Architectural Studio Visual */}
        <div className="lg:col-span-6">
          <div className="w-full h-full min-h-[260px] lg:min-h-[380px] rounded-xl overflow-hidden border border-[#D7E2F0] bg-[#E8EEF6] relative">
            {!imgFailed ? (
              <img
                src={heroStudioImg}
                alt="Daaga Software Builders web engineering desk"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full lg:h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-[#0B1D3A] to-[#1E3A6E] text-white">
                <Code2 className="w-10 h-10 text-[#93C5FD] mb-3" />
                <p className="font-display text-xl font-semibold">Daaga Software Builders</p>
                <p className="text-sm text-[#BFDBFE] mt-1">
                  Web Apps Only · Basic ₹699 · High-End ₹1,399 Max
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full-Width 4-Column Quantitative Proof Strip */}
      <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border-t border-b border-[#D7E2F0] bg-white">
        {STUDIO_METRICS.map((metric, idx) => (
          <div
            key={metric.label}
            className={`px-6 py-6 ${
              idx < STUDIO_METRICS.length - 1 ? 'lg:border-r border-[#D7E2F0]' : ''
            } ${idx % 2 === 0 ? 'border-r lg:border-r border-[#D7E2F0]' : ''} ${
              idx < 2 ? 'border-b lg:border-b-0 border-[#D7E2F0]' : ''
            }`}
          >
            <div className="font-mono tabular-nums text-2xl sm:text-3xl font-semibold text-[#0B1D3A]">
              {metric.value}
            </div>
            <div className="text-xs sm:text-sm text-[#3E5270] mt-1">{metric.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
