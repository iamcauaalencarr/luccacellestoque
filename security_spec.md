# Lucca Cell — Security Specification & Payload-First TDD

## 1. Data Invariants

1. **Access Control & Zero Self-Registration**: Only an authenticated Admin (`iamkauanalencar@gmail.com` with `email_verified == true` or an active Admin in `/users/{uid}`) may create or modify `/users/{userId}` and `/staffDirectory/{userId}`. Regular sellers cannot self-assign `role: 'admin'` or flip their own `active` flag.
2. **Synchronous Revocation**: Any user whose `/users/{uid}` document has `active == false` or does not exist is immediately blocked from reading or writing `/devices`, `/sales`, `/staffDirectory`, and `/auditLogs`.
3. **PII Isolation**: Email addresses stored in `/users/{userId}` are readable only by the document owner or an Admin (`isOwner(userId) || isAdmin()`). Non-PII operational profiles live in `/staffDirectory/{userId}`.
4. **Device Integrity & Reservations**: Sealed devices (`condition == 'lacrado'`) must always have `batteryHealth == 100` and may declare up to 12 `colorVariants` (`{ color, quantity }`). All devices must have `price > 0`, `storageGb > 0`, optional `imei` (max 32 chars), and valid status transitions (`disponivel` <-> `reservado`, or to `vendido`, or atomic `colorVariants` decrement while remaining `disponivel`). Only the reserver or an Admin may release or finalize a `reservado` device. Once `status == 'vendido'`, no actor may modify or resell the device.
5. **Atomic Sales, Trade-Ins & Audit Trail**: A sale record in `/sales/{saleId}` can only be created when `sellerId == request.auth.uid`, must reference an existing `disponivel` or authorized `reservado` device via `get()`, must atomically bind `saleId` on that device, and must create an `/auditLogs` entry. If `tradeIn` is supplied, `tradeIn.tradeInValue <= salePrice` and a matching `seminovo` device (`tradeInFromSaleId == saleId`) must be created atomically in `/devices/{tradeIn.deviceId}`. When `paymentMethod == 'misto'`, `paymentBreakdown` is mandatory and its sum must match `salePrice - tradeInValue` (`±0.02`).
6. **Immutable Audit Logs**: `/auditLogs/{logId}` is strictly append-only (`allow update, delete: if false`). Every log entry must bind `actorId == request.auth.uid` and `createdAt == request.time`.
7. **Temporal & ID Integrity**: All document IDs match `^[a-zA-Z0-9_\\-]+$` (max 128 chars) and all `createdAt`/`updatedAt` timestamps must equal `request.time`.
8. **Store Settings Protection**: Only active staff may read `/settings/store` (`allow list: if false`). Only verified Admins may create or update `/settings/store` with strict key/type/range checks (`updatedBy == request.auth.uid`, `updatedAt == request.time`), including installment rates (`1..12`), warranty days, and low-stock threshold.

## 2. The "Dirty Dozen" Payloads (Adversarial Tests -> PERMISSION_DENIED)

1. **Privilege Escalation (Self-Admin Creation)**: A seller creates `/users/{ownUid}` with `role: "admin"` -> DENIED.
2. **Role Tampering on Update**: A seller updates `/users/{ownUid}` changing `role` from `"vendedor"` to `"admin"` -> DENIED.
3. **Revoked Account Write**: A deactivated seller (`active: false`) attempts to create a sale in `/sales/{saleId}` -> DENIED.
4. **Spoofed Admin Email (Unverified)**: A user token has `email: "iamkauanalencar@gmail.com"` with `email_verified: false` attempting to list `/auditLogs` -> DENIED.
5. **PII Scraping**: A seller attempts `get` or `list` on `/users/{otherUid}` to read another user's email -> DENIED.
6. **Shadow Field Injection ("Ghost Field")**: Admin creates `/devices/{id}` with all valid fields plus an undeclared `isPromoted: true` field -> DENIED via `hasOnly()`.
7. **Seller Identity Spoofing in Sale**: Seller A creates `/sales/{saleId}` with `sellerId: "sellerB_uid"` -> DENIED.
8. **Reselling Sold Device (Terminal State Bypass)**: A seller attempts to update `/devices/{id}` where existing `status == "vendido"` back to `"disponivel"` -> DENIED.
9. **Non-Atomic Orphan Sale**: A seller creates `/sales/{saleId}` without updating the referenced `/devices/{deviceId}` status to `"vendido"` in the same batch -> DENIED via `getAfter()`.
10. **Sealed Device Invalid Battery**: Admin creates `/devices/{id}` with `condition: "lacrado"` and `batteryHealth: 88` -> DENIED.
11. **Timestamp Forgery**: A seller creates `/sales/{saleId}` with a backdated `createdAt` (`2020-01-01T00:00:00Z` != `request.time`) -> DENIED.
12. **Audit Log Tampering / Deletion**: Even an Admin attempts to `update` or `delete` an existing `/auditLogs/{logId}` -> DENIED.

## 3. Test Runner Reference

Tests verifying all 12 payloads against `@firebase/rules-unit-testing` are documented in `firestore.rules.test.ts`.
