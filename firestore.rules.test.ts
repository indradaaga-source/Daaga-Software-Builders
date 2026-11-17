// Security TDD assertions for Daaga Software Builders & Paid Orders Portal Firestore Rules.
// Each case below represents an adversarial payload expected to receive PERMISSION_DENIED.

export interface DirtyDozenCase {
  id: string;
  description: string;
  collection: string;
  operation: 'create' | 'update' | 'get' | 'list';
  payload: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: DirtyDozenCase[] = [
  {
    id: 'DD-01',
    description: 'Unauthenticated client attempts to create a software build order',
    collection: 'projectOrders',
    operation: 'create',
    payload: { id: 'order-1', userId: 'anon', orderNumber: 'DSB-2026-1001' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Signed-in user tries creating an order on behalf of another userId',
    collection: 'projectOrders',
    operation: 'create',
    payload: { id: 'order-2', userId: 'victim-uid', orderNumber: 'DSB-2026-1002' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Client tries setting initial status to delivered during order creation',
    collection: 'projectOrders',
    operation: 'create',
    payload: { status: 'delivered', studioNote: '' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'Shadow field injection in projectOrders payload',
    collection: 'projectOrders',
    operation: 'create',
    payload: { adminApproved: true, paymentStatus: 'paid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Client marks paymentStatus paid with empty paymentRef or mismatched paidAmount',
    collection: 'projectOrders',
    operation: 'create',
    payload: { paymentStatus: 'paid', paidAmount: 0, paymentRef: '' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Client attempts to pay ₹1 on a ₹1,399 order during update',
    collection: 'projectOrders',
    operation: 'update',
    payload: { paymentStatus: 'paid', paidAmount: 1, paymentRef: 'UTR123456' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Non-admin attempts to transition order status or overwrite studioNote',
    collection: 'projectOrders',
    operation: 'update',
    payload: { status: 'in_development', studioNote: 'Free upgrade' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'Client attempts to mutate an order after status reached delivered',
    collection: 'projectOrders',
    operation: 'update',
    payload: { projectBrief: 'Trying to alter delivered scope' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Invalid orderNumber pattern rejected by regex guard',
    collection: 'projectOrders',
    operation: 'create',
    payload: { orderNumber: 'FREE-999' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'Extreme negative or out-of-range estimatedTotal or paidAmount',
    collection: 'projectOrders',
    operation: 'create',
    payload: { estimatedTotal: -500, paidAmount: 99999999 },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Client-supplied backdated createdAt timestamp instead of serverTimestamp()',
    collection: 'projectOrders',
    operation: 'create',
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Non-admin user attempts un-scoped collection list on projectOrders',
    collection: 'projectOrders',
    operation: 'list',
    payload: {},
    expectedResult: 'PERMISSION_DENIED',
  },
];
