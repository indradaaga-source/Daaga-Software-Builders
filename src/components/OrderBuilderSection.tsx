import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Edit3,
  ExternalLink,
  LogIn,
  QrCode,
  ShieldCheck,
} from 'lucide-react';
import {
  BASIC_WEBSITE_PRICE_INR,
  DESCRIBE_STARTER_PROMPTS,
  HIGH_END_WEBAPP_PRICE_INR,
  MAX_WEB_APP_PRICE_INR,
  SOFTWARE_PACKAGES,
} from '../data/softwareCatalog';
import { useStudio } from '../context/StudioContext';
import { useAuth } from '../context/AuthContext';
import {
  PaymentPreference,
  PaymentStatus,
  SoftwareOrder,
  WebsiteTierId,
} from '../types/softwareBuilder';

const FALLBACK_APP_ORIGIN = 'https://ais-dev-u7ihcezegpinatghukjrne-853469935535.asia-northeast1.run.app';
const UPI_ID = 'daagasoftware@upi';

type OrderFlowStep = 'describe' | 'ask-place-order' | 'checkout';

export const OrderBuilderSection: React.FC = () => {
  const {
    formatRupees,
    selectedPackageId,
    setSelectedPackageId,
    selectedTier,
    selectTier,
    estimatedTotal,
    estimatedDeliveryLabel,
    placeSoftwareOrder,
    latestSubmittedOrder,
    setLatestSubmittedOrder,
    setActiveSection,
    showToast,
  } = useStudio();

  const { user, isSigningIn, signInWithGoogle } = useAuth();

  const [flowStep, setFlowStep] = useState<OrderFlowStep>('describe');

  // Step 1: Describe fields
  const [projectTitle, setProjectTitle] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [referenceUrl, setReferenceUrl] = useState('');

  // Step 3: Contact & Payment fields
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [paymentPreference, setPaymentPreference] =
    useState<PaymentPreference>('milestone_upi_bank');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('paid');
  const [paymentRef, setPaymentRef] = useState('');
  const [kickoffSlot, setKickoffSlot] = useState('Morning (10 AM – 1 PM)');

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedOrderLink, setCopiedOrderLink] = useState(false);

  useEffect(() => {
    if (user) {
      if (!clientName && user.displayName) setClientName(user.displayName);
      if (!clientEmail && user.email) setClientEmail(user.email);
    }
  }, [user, clientName, clientEmail]);

  const selectedPackage =
    SOFTWARE_PACKAGES.find((p) => p.id === selectedPackageId) || SOFTWARE_PACKAGES[0];

  const tierPackages = SOFTWARE_PACKAGES.filter((p) => p.tierId === selectedTier);
  const safeFinalPrice = Math.min(MAX_WEB_APP_PRICE_INR, estimatedTotal);

  // Generate live UPI QR code for exact ₹699 or ₹1,399 amount
  useEffect(() => {
    const note = encodeURIComponent(projectTitle.trim() || 'Daaga Web App');
    const upiUri = `upi://pay?pa=${UPI_ID}&pn=Daaga%20Software%20Builders&am=${safeFinalPrice}&cu=INR&tn=${note}`;
    QRCode.toDataURL(upiUri, {
      width: 200,
      margin: 1,
      color: { dark: '#0B1D3A', light: '#FFFFFF' },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [safeFinalPrice, projectTitle]);

  const handleTierSwitch = (tier: WebsiteTierId) => {
    selectTier(tier);
  };

  const handleUseStarterPrompt = (promptText: string) => {
    setProjectBrief(promptText);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.projectBrief;
      return next;
    });
    if (
      promptText.toLowerCase().includes('high-end') ||
      promptText.toLowerCase().includes('custom web app')
    ) {
      selectTier('high-end-webapp');
    } else {
      selectTier('basic-website');
    }
  };

  const handleDoneDescribing = () => {
    const errors: Record<string, string> = {};
    if (projectTitle.trim().length < 2) {
      errors.projectTitle =
        'Please enter a short name for your website or shop (e.g. Sharma Kirana Store).';
    }
    if (projectBrief.trim().length < 10) {
      errors.projectBrief =
        'Please write at least a short sentence (10+ characters) describing what you want on your website.';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setFlowStep('ask-place-order');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyUpi = async () => {
    try {
      await navigator.clipboard.writeText(UPI_ID);
      setCopiedUpi(true);
      showToast('UPI ID copied', UPI_ID);
      setTimeout(() => setCopiedUpi(false), 2200);
    } catch {
      showToast('UPI ID', UPI_ID);
    }
  };

  const handleQuickDemoPay = () => {
    const generatedRef = `UPI-${Math.floor(100000000000 + Math.random() * 899999999999)}`;
    setPaymentStatus('paid');
    setPaymentRef(generatedRef);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.paymentRef;
      return next;
    });
    showToast(`Payment of ₹${safeFinalPrice} verified`, `Reference: ${generatedRef}`);
  };

  const validateCheckoutForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (clientName.trim().length < 2) {
      errors.clientName = 'Please enter your full name.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      errors.clientEmail = 'Please enter a valid email address.';
    }
    if (clientPhone.trim().length > 0 && clientPhone.trim().length < 8) {
      errors.clientPhone = 'Please enter a valid 10-digit mobile / WhatsApp number.';
    }
    if (paymentStatus === 'paid' && paymentRef.trim().length < 3) {
      errors.paymentRef =
        'Please enter your UPI / Transaction ID (or click "Instant Pay Now" above).';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCheckoutForm()) return;

    setIsSubmitting(true);
    try {
      await placeSoftwareOrder({
        clientName,
        clientEmail,
        clientPhone,
        companyName,
        projectTitle,
        paymentPreference,
        paymentStatus,
        paymentRef,
        projectBrief,
        referenceUrl,
        kickoffSlot,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
      showToast('Google account connected', 'Your paid order will sync automatically.');
    } catch {
      showToast('Sign-in cancelled', 'You can still pay and place your order directly.');
    }
  };

  const buildOrderShareLink = (order: SoftwareOrder) => {
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : FALLBACK_APP_ORIGIN;
    return `${origin}/?order=${encodeURIComponent(order.orderNumber)}`;
  };

  const handleCopyShareLink = async (order: SoftwareOrder) => {
    const link = buildOrderShareLink(order);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedOrderLink(true);
      showToast('Order tracking link copied', order.orderNumber);
      setTimeout(() => setCopiedOrderLink(false), 2400);
    } catch {
      showToast('Shareable order link', link);
    }
  };

  const startNewOrder = () => {
    setLatestSubmittedOrder(null);
    setFlowStep('describe');
    setProjectTitle('');
    setProjectBrief('');
    setReferenceUrl('');
    setPaymentRef('');
    setPaymentStatus('paid');
    setFormErrors({});
  };

  // Order Confirmation Receipt Screen
  if (latestSubmittedOrder) {
    const isPaid = latestSubmittedOrder.paymentStatus === 'paid';
    return (
      <section className="max-w-[920px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-[#D7E2F0] rounded-xl p-8 sm:p-10 space-y-8">
          <div className="space-y-2 border-b border-[#D7E2F0] pb-6">
            <p className="text-xs font-mono font-semibold text-[#1E40AF]">
              ORDER CONFIRMED · {latestSubmittedOrder.orderNumber} ·{' '}
              {isPaid ? `PAID ${formatRupees(latestSubmittedOrder.paidAmount)}` : 'PAYMENT PENDING'}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
              Thank you! Order placed for {latestSubmittedOrder.projectTitle}
            </h2>
            <p className="text-sm text-[#3E5270]">
              We will message you within 24 hours ({latestSubmittedOrder.kickoffSlot}) with the first preview of your web app.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-[#4E6487]">Customer</div>
              <div className="font-semibold text-[#0B1D3A] mt-1">
                {latestSubmittedOrder.clientName}
              </div>
              <div className="text-[#3E5270]">{latestSubmittedOrder.clientEmail}</div>
              {latestSubmittedOrder.clientPhone && (
                <div className="text-[#3E5270] text-xs mt-0.5">
                  {latestSubmittedOrder.clientPhone}
                </div>
              )}
            </div>
            <div>
              <div className="text-xs text-[#4E6487]">Selected Web App Plan</div>
              <div className="font-semibold text-[#0B1D3A] mt-1">
                {latestSubmittedOrder.packageTitle}
              </div>
              <div className="text-xs text-[#3E5270] mt-0.5">
                {latestSubmittedOrder.addonsSummary}
              </div>
            </div>
            <div>
              <div className="text-xs text-[#4E6487]">
                {isPaid ? 'Amount Paid' : 'Amount Due'}
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0B1D3A] mt-1">
                {formatRupees(latestSubmittedOrder.estimatedTotal)}
              </div>
              <div className="text-xs text-[#1E40AF]">
                {isPaid
                  ? `Paid · Ref: ${latestSubmittedOrder.paymentRef}`
                  : 'Unpaid — pay from Track Order anytime'}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#D7E2F0] space-y-2">
            <div className="text-xs font-semibold text-[#0B1D3A]">What You Described</div>
            <p className="text-sm text-[#3E5270] whitespace-pre-wrap leading-relaxed">
              {latestSubmittedOrder.projectBrief}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActiveSection('track-order')}
              className="px-5 py-2.5 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[44px]"
            >
              <span>Track Order Status</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleCopyShareLink(latestSubmittedOrder)}
              className="px-4 py-2.5 bg-white border border-[#D7E2F0] hover:bg-[#EDF2F8] text-[#0B1D3A] text-sm font-medium rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[44px]"
            >
              {copiedOrderLink ? (
                <Check className="w-4 h-4 text-[#15803D]" />
              ) : (
                <Copy className="w-4 h-4 text-[#1E40AF]" />
              )}
              <span>{copiedOrderLink ? 'Tracking Link Copied' : 'Copy Tracking Link'}</span>
            </button>

            <a
              href="/paid-orders"
              className="px-4 py-2.5 bg-[#EFF5FF] border border-[#BFDBFE] hover:bg-[#DBEAFE] text-[#1E40AF] text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[44px]"
            >
              <span>View Paid Orders Website</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={startNewOrder}
              className="px-4 py-2.5 text-sm font-medium text-[#1E40AF] hover:text-[#0B1D3A] ml-auto"
            >
              Order Another Website
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      {/* Header & Simple 3-Step Indicator */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#D7E2F0] pb-6">
        <div>
          <h1
            className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-[#0B1D3A]"
            style={{ textWrap: 'balance' }}
          >
            Describe your web app &amp; place your order
          </h1>
          <p className="text-sm sm:text-base text-[#3E5270] mt-2 max-w-2xl">
            We make only web apps. Pick Basic (₹699) or High-End (₹1,399 max), write what exact website you want, and once you are done describing we will ask you to place your order.
          </p>
        </div>

        <div className="text-xs font-mono font-semibold text-[#1E40AF] whitespace-nowrap">
          Max Web App Price: {formatRupees(MAX_WEB_APP_PRICE_INR)}
        </div>
      </div>

      {/* Stepper Bar */}
      <div className="grid grid-cols-3 gap-3 text-xs sm:text-sm">
        <div
          className={`p-3.5 rounded-lg border ${
            flowStep === 'describe'
              ? 'bg-[#0B1D3A] border-[#0B1D3A] text-white font-semibold'
              : 'bg-white border-[#D7E2F0] text-[#0B1D3A]'
          }`}
        >
          1. Pick Plan &amp; Describe
        </div>
        <div
          className={`p-3.5 rounded-lg border ${
            flowStep === 'ask-place-order'
              ? 'bg-[#0B1D3A] border-[#0B1D3A] text-white font-semibold'
              : flowStep === 'checkout'
                ? 'bg-[#EFF5FF] border-[#BFDBFE] text-[#0B1D3A]'
                : 'bg-white border-[#D7E2F0] text-[#4E6487]'
          }`}
        >
          2. Ready to Order?
        </div>
        <div
          className={`p-3.5 rounded-lg border ${
            flowStep === 'checkout'
              ? 'bg-[#0B1D3A] border-[#0B1D3A] text-white font-semibold'
              : 'bg-white border-[#D7E2F0] text-[#4E6487]'
          }`}
        >
          3. Pay &amp; Place Order
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Cols: Active Step */}
        <div className="lg:col-span-7 space-y-6">
          {flowStep === 'describe' && (
            <>
              {/* Tier Selection: Basic ₹699 vs High-End ₹1,399 Max */}
              <div className="bg-white border border-[#D7E2F0] rounded-xl p-6 space-y-4">
                <h2 className="font-display text-lg font-bold text-[#0B1D3A]">
                  01. Choose Website Type (Web Apps Only)
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleTierSwitch('basic-website')}
                    className={`text-left p-4 rounded-xl border transition-smooth space-y-2 ${
                      selectedTier === 'basic-website'
                        ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                        : 'border-[#D7E2F0] bg-[#FAFBFD] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#1E40AF]">3–4 Days Delivery</span>
                      <span className="font-mono tabular-nums text-lg font-bold text-[#0B1D3A]">
                        {formatRupees(BASIC_WEBSITE_PRICE_INR)}
                      </span>
                    </div>
                    <div className="font-display font-bold text-base text-[#0B1D3A]">
                      Basic Website
                    </div>
                    <p className="text-xs text-[#3E5270] leading-relaxed">
                      Simple 1–4 page website for shops, coaching classes, clinics, or personal showcase with WhatsApp button &amp; inquiry form.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTierSwitch('high-end-webapp')}
                    className={`text-left p-4 rounded-xl border transition-smooth space-y-2 ${
                      selectedTier === 'high-end-webapp'
                        ? 'border-[#1D4ED8] bg-[#EFF5FF]'
                        : 'border-[#D7E2F0] bg-[#FAFBFD] hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#1E40AF]">5–7 Days Delivery</span>
                      <span className="font-mono tabular-nums text-lg font-bold text-[#0B1D3A]">
                        {formatRupees(HIGH_END_WEBAPP_PRICE_INR)}
                      </span>
                    </div>
                    <div className="font-display font-bold text-base text-[#0B1D3A]">
                      High-End Web App (Max Price)
                    </div>
                    <p className="text-xs text-[#3E5270] leading-relaxed">
                      Full interactive web app with online cart, UPI flow, Google login, saved database records, and admin dashboard. Maximum price ₹1,399.
                    </p>
                  </button>
                </div>

                {/* Specific template focus inside selected tier */}
                <div className="pt-2 space-y-2">
                  <div className="text-xs font-semibold text-[#4E6487]">
                    Pick closest style ({selectedTier === 'basic-website' ? '₹699' : '₹1,399 Max'}):
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tierPackages.map((pkg) => {
                      const active = pkg.id === selectedPackage.id;
                      return (
                        <button
                          key={pkg.id}
                          type="button"
                          onClick={() => setSelectedPackageId(pkg.id)}
                          className={`text-left p-3 rounded-lg border text-xs transition-smooth ${
                            active
                              ? 'border-[#0B1D3A] bg-[#0B1D3A] text-white'
                              : 'border-[#D7E2F0] bg-white text-[#0B1D3A] hover:bg-[#F6F8FB]'
                          }`}
                        >
                          <div className="font-semibold">{pkg.title}</div>
                          <div
                            className={`mt-1 ${
                              active ? 'text-[#BFDBFE]' : 'text-[#4E6487]'
                            }`}
                          >
                            {pkg.includesSummary}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Describe What You Want Box */}
              <div className="bg-white border border-[#D7E2F0] rounded-xl p-6 space-y-5">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#0B1D3A]">
                    02. Describe the exact website / web app you want
                  </h2>
                  <p className="text-xs sm:text-sm text-[#3E5270] mt-1">
                    Write in simple words what your website should have (pages, colours, buttons, products, forms, or anything else).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Website / Business Name *
                  </label>
                  <input
                    type="text"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    placeholder="e.g. Sharma Kirana Online Store or Patel Tuition Website"
                    maxLength={160}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formErrors.projectTitle && (
                    <p className="text-xs text-[#B91C1C] mt-1">{formErrors.projectTitle}</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#0B1D3A]">
                      Describe Your Website Here *
                    </label>
                    <span className="text-[11px] font-mono text-[#4E6487]">
                      {projectBrief.trim().length} / 2500
                    </span>
                  </div>
                  <textarea
                    rows={5}
                    value={projectBrief}
                    onChange={(e) => setProjectBrief(e.target.value)}
                    placeholder="Example: I want a clean blue-and-white website for my bakery in Pune. Customers should see our cake photos and prices, add items to cart, and send their order with phone number and UPI option."
                    maxLength={2500}
                    className="w-full px-3.5 py-3 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formErrors.projectBrief && (
                    <p className="text-xs text-[#B91C1C] mt-1">{formErrors.projectBrief}</p>
                  )}
                </div>

                {/* Quick Example Ideas */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#4E6487]">
                    Need help writing? Click an example to fill it in and edit:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DESCRIBE_STARTER_PROMPTS.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => handleUseStarterPrompt(example)}
                        className="text-left p-2.5 rounded-lg border border-[#D7E2F0] bg-[#F6F8FB] hover:bg-[#EFF5FF] hover:border-[#93C5FD] text-xs text-[#1E3354] transition-smooth"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Any website link you like for reference? (Optional)
                  </label>
                  <input
                    type="url"
                    value={referenceUrl}
                    onChange={(e) => setReferenceUrl(e.target.value)}
                    placeholder="https://example.com"
                    maxLength={300}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-[#EDF2F7]">
                  <div className="text-xs text-[#4E6487]">
                    Once you finish describing, we will ask if you want to place the order.
                  </div>
                  <button
                    type="button"
                    onClick={handleDoneDescribing}
                    className="px-6 py-3 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[44px]"
                  >
                    <span>Done Describing</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: Explicit Question Asking Customer About Placing Order */}
          {flowStep === 'ask-place-order' && (
            <div className="bg-white border border-[#1D4ED8] rounded-xl p-6 sm:p-8 space-y-6">
              <div className="space-y-2 border-b border-[#D7E2F0] pb-5">
                <p className="text-xs font-mono font-semibold text-[#1E40AF]">
                  DESCRIPTION COMPLETE
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D3A]">
                  You&apos;re done describing — would you like to place your order now?
                </h2>
                <p className="text-sm text-[#3E5270]">
                  Please check what you wrote below. If everything looks right, click &ldquo;Yes, Place My Order&rdquo; to pay {formatRupees(safeFinalPrice)} and confirm.
                </p>
              </div>

              <div className="p-5 rounded-lg bg-[#F6F8FB] border border-[#D7E2F0] space-y-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[#D7E2F0] pb-3">
                  <div>
                    <div className="text-xs text-[#4E6487]">Website / Project Name</div>
                    <div className="font-display text-lg font-bold text-[#0B1D3A]">
                      {projectTitle}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#4E6487]">Total Amount</div>
                    <div className="font-mono tabular-nums text-2xl font-bold text-[#0B1D3A]">
                      {formatRupees(safeFinalPrice)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#4E6487]">Selected Plan: </span>
                    <span className="font-semibold text-[#0B1D3A]">{selectedPackage.title}</span>
                  </div>
                  <div>
                    <span className="text-[#4E6487]">Delivery Time: </span>
                    <span className="font-semibold text-[#0B1D3A]">{estimatedDeliveryLabel}</span>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#0B1D3A] mb-1">
                    Your Description:
                  </div>
                  <p className="text-sm text-[#3E5270] whitespace-pre-wrap leading-relaxed">
                    {projectBrief}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setFlowStep('checkout');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3 bg-[#0B1D3A] hover:bg-[#152E58] text-white text-sm font-semibold rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[46px]"
                >
                  <Check className="w-4 h-4" />
                  <span>Yes, Place My Order ({formatRupees(safeFinalPrice)})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFlowStep('describe')}
                  className="px-4 py-3 bg-white border border-[#CBD8E8] hover:bg-[#EDF2F8] text-[#0B1D3A] text-sm font-medium rounded-lg transition-smooth inline-flex items-center gap-2 min-h-[46px]"
                >
                  <Edit3 className="w-4 h-4 text-[#1E40AF]" />
                  <span>Edit Description</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Contact + UPI / Payment Verification Form */}
          {flowStep === 'checkout' && (
            <form
              onSubmit={handleSubmitOrder}
              noValidate
              className="bg-white border border-[#D7E2F0] rounded-xl p-6 sm:p-8 space-y-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D7E2F0] pb-4">
                <div>
                  <h2 className="font-display text-xl font-bold text-[#0B1D3A]">
                    03. Pay {formatRupees(safeFinalPrice)} &amp; Place Your Order
                  </h2>
                  <p className="text-xs sm:text-sm text-[#3E5270] mt-1">
                    Paid orders appear immediately on the Daaga Paid Orders dashboard for build start.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setFlowStep('describe')}
                  className="text-xs font-semibold text-[#1E40AF] hover:text-[#0B1D3A] inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Edit Description</span>
                </button>
              </div>

              {/* Contact Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Rahul Sharma"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formErrors.clientName && (
                    <p className="text-xs text-[#B91C1C] mt-1">{formErrors.clientName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    WhatsApp / Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    maxLength={30}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formErrors.clientPhone && (
                    <p className="text-xs text-[#B91C1C] mt-1">{formErrors.clientPhone}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="rahul@gmail.com"
                    maxLength={200}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                  {formErrors.clientEmail && (
                    <p className="text-xs text-[#B91C1C] mt-1">{formErrors.clientEmail}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Shop / Business Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Sharma Enterprises"
                    maxLength={120}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Best Time to Message / Call
                  </label>
                  <select
                    value={kickoffSlot}
                    onChange={(e) => setKickoffSlot(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A]"
                  >
                    <option value="Morning (10 AM – 1 PM)">Morning (10 AM – 1 PM)</option>
                    <option value="Afternoon (1 PM – 5 PM)">Afternoon (1 PM – 5 PM)</option>
                    <option value="Evening (5 PM – 8 PM)">Evening (5 PM – 8 PM)</option>
                    <option value="WhatsApp Only — No Call Needed">
                      WhatsApp Only — No Call Needed
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#0B1D3A] mb-1.5">
                    Payment Method
                  </label>
                  <select
                    value={paymentPreference}
                    onChange={(e) => setPaymentPreference(e.target.value as PaymentPreference)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#CBD8E8] bg-white text-sm text-[#0B1D3A]"
                  >
                    <option value="milestone_upi_bank">UPI / GPay / PhonePe / Paytm</option>
                    <option value="corporate_invoice">Bank Transfer / NEFT</option>
                    <option value="card_checkout">Debit / Credit Card</option>
                  </select>
                </div>
              </div>

              {/* Payment Verification Box */}
              <div className="p-5 rounded-xl border border-[#BFDBFE] bg-[#F6F9FF] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold text-[#0B1D3A]">
                      Payment Status ({formatRupees(safeFinalPrice)})
                    </div>
                    <p className="text-xs text-[#3E5270]">
                      Scan UPI QR or click Instant Pay Now so your order goes to our Paid Orders board right away.
                    </p>
                  </div>

                  <div className="flex items-center p-1 bg-white rounded-lg border border-[#D7E2F0]">
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('paid')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-smooth ${
                        paymentStatus === 'paid'
                          ? 'bg-[#0B1D3A] text-white'
                          : 'text-[#3E5270] hover:text-[#0B1D3A]'
                      }`}
                    >
                      Pay Now ({formatRupees(safeFinalPrice)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentStatus('unpaid')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-smooth ${
                        paymentStatus === 'unpaid'
                          ? 'bg-[#0B1D3A] text-white'
                          : 'text-[#3E5270] hover:text-[#0B1D3A]'
                      }`}
                    >
                      Pay Later
                    </button>
                  </div>
                </div>

                {paymentStatus === 'paid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center pt-2 border-t border-[#D7E2F0]">
                    <div className="sm:col-span-4 flex flex-col items-center bg-white p-3 rounded-lg border border-[#D7E2F0]">
                      {qrDataUrl ? (
                        <img
                          src={qrDataUrl}
                          alt={`UPI QR code for ₹${safeFinalPrice}`}
                          className="w-32 h-32 object-contain"
                        />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center text-[#4E6487]">
                          <QrCode className="w-10 h-10" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="mt-2 text-[11px] font-mono font-semibold text-[#1E40AF] hover:text-[#0B1D3A] inline-flex items-center gap-1"
                      >
                        <span>{UPI_ID}</span>
                        {copiedUpi ? (
                          <Check className="w-3 h-3 text-[#15803D]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="sm:col-span-8 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#0B1D3A] mb-1">
                          UPI Transaction / UTR Reference ID *
                        </label>
                        <input
                          type="text"
                          value={paymentRef}
                          onChange={(e) => setPaymentRef(e.target.value)}
                          placeholder="Enter 12-digit UTR or payment ref (e.g. 432198765432)"
                          maxLength={100}
                          className="w-full px-3.5 py-2 rounded-lg border border-[#CBD8E8] bg-white text-sm font-mono text-[#0B1D3A] focus:outline-none focus:ring-2 focus:ring-[#1D4ED8]"
                        />
                        {formErrors.paymentRef && (
                          <p className="text-xs text-[#B91C1C] mt-1">{formErrors.paymentRef}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={handleQuickDemoPay}
                        className="px-4 py-2 bg-[#EFF5FF] hover:bg-[#DBEAFE] border border-[#93C5FD] text-[#1E40AF] text-xs font-semibold rounded-lg transition-smooth"
                      >
                        Instant Pay {formatRupees(safeFinalPrice)} (Generate Payment Ref)
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#4E6487] pt-1 border-t border-[#D7E2F0]">
                    Your order will be saved as &ldquo;Payment Pending&rdquo;. You can complete payment later from the Track Order page.
                  </p>
                )}
              </div>

              {/* Google Account Optional Sync */}
              <div className="p-3.5 rounded-lg border border-[#D7E2F0] bg-[#F6F8FB] flex items-center justify-between gap-3">
                <div className="text-xs text-[#3E5270]">
                  {user ? (
                    <span className="flex items-center gap-1.5 text-[#0B1D3A] font-medium">
                      <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                      <span>Syncing order to Firestore as {user.email}</span>
                    </span>
                  ) : (
                    <span>Optional: Sign in with Google to save your order in the cloud.</span>
                  )}
                </div>
                {!user && (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isSigningIn}
                    className="px-3 py-1.5 rounded-md border border-[#CBD8E8] bg-white hover:bg-[#EDF2F8] text-xs font-semibold text-[#0B1D3A] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#1D4ED8]" />
                    <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 bg-[#0B1D3A] hover:bg-[#152E58] disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition-smooth min-h-[48px]"
              >
                {isSubmitting
                  ? 'Placing Your Order...'
                  : paymentStatus === 'paid'
                    ? `Confirm Payment (${formatRupees(safeFinalPrice)}) & Place Order`
                    : `Place Order (Pay ${formatRupees(safeFinalPrice)} Later)`}
              </button>
            </form>
          )}
        </div>

        {/* Right 5 Cols: Fixed-Price Summary Card */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#D7E2F0] rounded-xl p-6 sm:p-7 space-y-6">
          <div className="space-y-1 border-b border-[#D7E2F0] pb-4">
            <div className="text-xs font-medium text-[#1E40AF]">Your Web App Order Summary</div>
            <h3 className="font-display text-xl font-bold text-[#0B1D3A]">
              {selectedTier === 'basic-website'
                ? 'Basic Website Plan'
                : 'High-End Web App Plan (Max ₹1,399)'}
            </h3>
            <div className="text-xs text-[#4E6487]">{selectedPackage.title}</div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between text-[#3E5270]">
              <span>Service Type</span>
              <span className="font-medium text-[#0B1D3A]">Web App Only</span>
            </div>
            <div className="flex items-center justify-between text-[#3E5270]">
              <span>Delivery Time</span>
              <span className="font-mono font-medium text-[#0B1D3A]">
                {estimatedDeliveryLabel}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#3E5270]">
              <span>Maximum Price Cap</span>
              <span className="font-mono tabular-nums font-medium text-[#0B1D3A]">
                {formatRupees(MAX_WEB_APP_PRICE_INR)}
              </span>
            </div>

            <div className="pt-3 border-t border-[#D7E2F0] flex items-baseline justify-between">
              <span className="font-semibold text-[#0B1D3A]">Final Price</span>
              <span className="font-mono tabular-nums text-3xl font-bold text-[#0B1D3A]">
                {formatRupees(safeFinalPrice)}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-[#F6F8FB] border border-[#D7E2F0] space-y-2 text-xs text-[#3E5270] leading-relaxed">
            <div className="font-semibold text-[#0B1D3A]">Simple Pricing Promise</div>
            <p>
              Basic websites are always <span className="font-semibold text-[#0B1D3A]">₹699</span>. Full high-end web apps are <span className="font-semibold text-[#0B1D3A]">₹1,399</span> — our last and maximum amount. No extra charges later.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
};
