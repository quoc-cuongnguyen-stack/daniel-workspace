# Bug Case: BUG-931 / TASK-931 — Updated Country-Specific Regional Prices Not Displaying to Users

## 📌 Bug Summary
Users across multiple countries (such as India) were not seeing updated regional membership pricing on the frontend, even after pricing adjustments were saved in the backend/database.

---

## 🔍 Root Cause Analysis

1. **Guest Cache Poisoning (`pricing.resolver.ts`)**:
   - `getSubscriptionPrice` query cache used `key: { viewerId: getViewerCacheId(context) }`.
   - Unauthenticated visitors resolved `viewerId` to `'guest'`. As a result, all guests globally shared a single Redis cache key for 5 minutes (`300` seconds). The first guest's resolved location/currency (e.g. US / $9.99) was served to all subsequent guests regardless of country.

2. **Backend Ignored Logged-in User Profile Country (`pricing.controller.ts`)**:
   - `getSubscriptionPrice` attempted to inspect `userFound.result.lastLoginIp`. If `lastLoginIp` was local (`127.0.0.1`), missing, or failed IP lookup, `getSubscriptionPrice` ignored `userFound.result.countryId` or `partner1.location.countryId`, leaving `countryId` as `undefined`.

3. **Frontend Ignored Logged-in User Profile Country (`pricing.hook.ts`)**:
   - `useGetPrice` relied exclusively on `getGeolocationFromIP()`. It omitted `auth.user?.partner1?.location?.countryId`.

4. **Lowercase ISO2 Country Code Mismatch (`pricing.hook.ts`)**:
   - `getGeolocationFromIP()` Layer 2 (`navigator.language`) returns lowercase country codes (e.g. `"in"`, `"us"`).
   - `useGetCountries({ iso2: { eq: ipData.countryCode } })` sent `{ iso2: { eq: "in" } }`. Since MongoDB `Country` collection stores uppercase `iso2: "IN"`, exact string query returned 0 matches, setting `countryId` to `undefined`.

5. **Missing `isActive: true` Filter Guard (`pricing.hook.ts`)**:
   - `GetPricingDocument` filter omitted `isActive: true`, risking matching inactive pricing documents.

6. **Missing Fallback to Default Pricing (`pricing.hook.ts`)**:
   - If a country had no custom state/country pricing record, `useGetPrice` skipped country query without a third tier for general/default pricing, returning `pricing: null` and `totalPrice: null`.

---

## 🛠️ Resolution & Implementation Details

1. **Client IP Extraction & Local IP Check (`ssl-be/src/shared/util/ip.ts`)**:
   - Updated `extractClientIp` to check `cf-connecting-ip`, `x-forwarded-for` (first entry), `x-real-ip`, and fallback IP.
   - Enhanced `isLocalIp` to reject loopback (`127.0.0.1`, `::1`), private subnets (`10.x`, `192.168.x`, `172.16-31.x`), and local hostnames.

2. **Guest Cache Key Scoping (`ssl-be/src/modules/pricing/pricing.resolver.ts`)**:
   - Updated `getSubscriptionPrice` cache key to `{ viewerId, ip: viewerId === 'guest' ? clientIp : undefined }`.

3. **Backend Profile Country Fallback (`ssl-be/src/modules/pricing/pricing.controller.ts`)**:
   - Updated `getSubscriptionPrice` to check `userFound.result.countryId` / `partner1.location.countryId` when `lastLoginIp` is missing, local, or fails IP lookup.
   - Standardized ISO2 queries with `.toUpperCase()`.

4. **Frontend Hook Integration (`ssl-fe-user/src/modules/pricing/pricing.hook.ts`)**:
   - Imported `useAuth` and extracted `userCountryId`.
   - Normalized `ipData.countryCode` to `.toUpperCase()`.
   - Priority chain: `userCountryId` $\rightarrow$ `state.countryId` $\rightarrow$ `countriesByCode[0].id`.
   - Added `isActive: true` to `GetPricingDocument` query variables.
   - Added 3-tier sequential fallback query (`dataByDefault`) for general pricing when state and country queries return null.

---

## 🧪 Verification & Unit Tests

- **Backend Unit Tests**:
  - `ssl-be/src/modules/pricing/pricing.controller.test.ts` (7 tests passed).
- **Frontend Unit Tests**:
  - `ssl-fe-user/src/modules/pricing/pricing.hook.test.unit.ts` (2 tests passed).
- **Linter Checks**:
  - Clean lint pass across `ssl-be` and `ssl-fe-user`.
