# Daaga Software Builders — Firestore Security Specification

## 1. Data Invariants
1. **Default Deny**: All unmatched paths are explicitly denied (`match /{document=**} { allow read, write: if false; }`).
2. **PII Isolation**: Client emails, phone numbers, and company details inside `users/{uid}/private/info` and `projectOrders/{orderId}` are strictly scoped to the document owner (`userId == request.auth.uid`) or verified studio admins (`yashpillalamarri2013@gmail.com` or `admins/{uid}`).
3. **Identity & Email Verification**: All standard writes require `isVerifiedUser()` (`request.auth != null && request.auth.token.email_verified == true`), and `userId` must match `request.auth.uid`.
4. **Initial Status & Studio Note Lock**: Clients creating a `SoftwareOrder` must start at `status == 'received'` and `studioNote == ''`. Only verified admins can transition order status across `scoping -> in_development -> qa_staging -> delivered` or write `studioNote`.
5. **Payment Bounds & Integrity**: `estimatedTotal` and `paidAmount` are bounded (`0..50000000` in general, and client payments cannot exceed `estimatedTotal`). Marking `paymentStatus == 'paid'` requires a positive `paidAmount > 0` and a valid `paymentRef` (`>= 3` characters). Clients can pay an `'unpaid'` order via a dedicated payment update branch matching `existing().estimatedTotal`.
6. **Terminal State Locking**: Once a `SoftwareOrder` reaches `status == 'delivered'`, non-admin edits are blocked.
7. **Temporal Integrity**: `createdAt == request.time` on create; `updatedAt == request.time` on update, and `createdAt` is immutable.
8. **Strict Validation**: Every collection uses an `isValid[Entity]()` helper enforcing `keys().hasAll(...)`, `keys().hasOnly(...)`, regex IDs, length caps, numeric bounds, and `affectedKeys().hasOnly(...)` per update branch.

## 2. Dirty Dozen Security Test Payloads
1. **Unauthenticated Create (`projectOrders`)**: Fails `isVerifiedUser()`.
2. **Spoofed Owner UID (`userId: "other-uid"`)**: Fails `incoming().userId == request.auth.uid`.
3. **Status Shortcutting on Create (`status: "delivered"`)**: Fails `incoming().status == 'received'`.
4. **Shadow / Ghost Field Injection (`isVerifiedFree: true` on `projectOrders`)**: Fails `data.keys().hasOnly(...)`.
5. **Studio Note Spoofing on Client Create (`studioNote: "Approved free"`)**: Fails `incoming().studioNote == ''`.
6. **Fake Payment Without Reference (`paymentStatus: "paid", paymentRef: ""`)**: Fails payment consistency rule.
7. **Underpaid Order Tampering (`paymentStatus: "paid", paidAmount: 1, estimatedTotal: 1399`)**: Fails `paidAmount == existing().estimatedTotal` on client payment update.
8. **Non-Admin Status Transition on Update (`status: "delivered"`)**: Fails `affectedKeys().hasOnly(...)`.
9. **Post-Delivery Modification by Client (`existing().status == 'delivered'`)**: Fails `existing().status != 'delivered'`.
10. **Malformed Order Number (`orderNumber: "INVALID-1"`)**: Fails regex `^DSB-[0-9]{4}-[0-9]{4}$`.
11. **Oversized Project Brief (> 2500 chars)**: Fails `data.projectBrief.size() <= 2500`.
12. **Blanket List Query by Non-Owner (`getDocs(collection(db, 'projectOrders'))` without owner filter)**: Fails `resource.data.userId == request.auth.uid || isAdmin()`.
