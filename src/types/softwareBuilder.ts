export type ServiceCategory = 'all' | 'basic-699' | 'high-end-1399';

export type WebsiteTierId = 'basic-website' | 'high-end-webapp';

export type CurrencyCode = 'INR';

export type TimelineWindow =
  | 'urgent_2_3_weeks'
  | 'standard_4_6_weeks'
  | 'flexible_8_plus_weeks';

export type EngagementModel = 'fixed_scope' | 'milestone_retainer';

export type PaymentPreference =
  | 'milestone_upi_bank'
  | 'corporate_invoice'
  | 'card_checkout';

export type PaymentStatus = 'paid' | 'unpaid';

export type ProjectOrderStatus =
  | 'received'
  | 'scoping'
  | 'in_development'
  | 'qa_staging'
  | 'delivered';

export interface SoftwarePackage {
  id: string;
  tierId: WebsiteTierId;
  indexLabel: string;
  category: Exclude<ServiceCategory, 'all'>;
  title: string;
  tagline: string;
  description: string;
  deliveryDays: string;
  priceInr: 699 | 1399;
  includesSummary: string;
  deliverables: string[];
  featured?: boolean;
}

export interface CaseStudy {
  id: string;
  client: string;
  sector: string;
  timeframe: string;
  title: string;
  outcomeMetric: string;
  summary: string;
  image: string;
  imageAlt: string;
  stack: string;
}

export interface SoftwareOrder {
  id: string;
  userId: string;
  orderNumber: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  companyName: string;
  projectTitle: string;
  packageId: string;
  packageTitle: string;
  addonsSummary: string;
  timelineWindow: TimelineWindow;
  engagementModel: EngagementModel;
  currency: CurrencyCode;
  estimatedTotal: number;
  paymentPreference: PaymentPreference;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  paymentRef: string;
  projectBrief: string;
  referenceUrl: string;
  kickoffSlot: string;
  status: ProjectOrderStatus;
  studioNote: string;
  createdAtLabel: string;
  source?: 'cloud' | 'local';
}
