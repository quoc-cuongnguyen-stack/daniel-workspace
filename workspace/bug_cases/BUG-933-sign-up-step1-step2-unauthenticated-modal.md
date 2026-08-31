# BUG-933: User Not Authenticated Modal on Sign-Up Step 1 to Step 2 Transition

> **Status:** ✅ Fixed  
> **Date Found:** 2026-08-10  
> **Date Fixed:** 2026-08-10  
> **Project:** ssl-fe-user / ssl-be  
> **Severity:** 🔴 Critical  

---

## 🔍 Description

When a new user submits Step 1 of registration ("Create Account") on `http://localhost:8001/en/auth/sign-up`, the account creation mutation succeeds and the UI transitions to Step 2 ("Verify your email address"). However, an error modal titled `"Oopsie..."` immediately pops up with the error message `"User not authenticated."` and a `"TRY AGAIN"` button.

## 🔄 Reproduction Steps

1. Navigate to `http://localhost:8001/en/auth/sign-up`.
2. Fill out Step 1 form (Username, Email, Password, AccountType, T&C check).
3. Click "VERIFY AND CONTINUE".
4. Registration mutation succeeds and Step 2 email verification UI opens.
5. **Actual behavior:** A modal overlays the screen displaying: `"Oopsie... User not authenticated."`.
6. **Expected behavior:** Step 2 displays smoothly without any error modal.

## 📸 Evidence

```
[browser] Apollo Error: CombinedGraphQLErrors: User not authenticated.
toastError({ message: "User not authenticated.", title: "Oopsie..." })
```

## 🧠 Root Cause Analysis

Two main root causes contributed to this issue:

1. **Unconditional WebSocket Subscription during Registration Flow:**
   `useSubscription(OnUserAuthEventDocument)` in [auth.provider.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/auth.provider.tsx#L814) had a skip condition of `skip: !auth?.isLoggedIn || !auth.user?.id`. When Step 1 completed, `auth.isLoggedIn` flipped to `true`. Because `registerStep` was `VERIFY_EMAIL` (not `COMPLETE`), Apollo Client attempted to open a WebSocket subscription to `onUserAuthEvent`. The WebSocket connection had no active session context or completed user registration, causing backend `subscribeToUserAuthEvent` in `authn.controller.ts` to throw `'Not authenticated'`.

2. **Omitted JWT Token in `handleRegisterSendVerifyEmail`:**
   In [auth.provider.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/auth.provider.tsx#L884), `handleRegisterSendVerifyEmail` was missing `token: token.value` in its GraphQL mutation variables. Unlike all other registration step helper functions (`handleRegisterVerifyEmail`, `handleRegisterPersonalInfo`, `handleRegisterPreferences`, `handleRegisterMembership`), `registerSendVerifyEmail` did not supply the newly received registration token in the payload.

## 🔧 Fix Applied

1. Updated `useSubscription(OnUserAuthEventDocument)` in [auth.provider.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/auth.provider.tsx#L814-L822) to skip WebSocket subscription during incomplete registration steps:
   ```ts
   skip: !auth?.isLoggedIn || !auth.user?.id || (auth.user.registerStep !== undefined && auth.user.registerStep !== E_RegisterStep.COMPLETE)
   ```

2. Updated `handleRegisterSendVerifyEmail` in [auth.provider.tsx](file:///Users/daniel/Projects/CyberSkill/SSL/ssl-fe-user/src/modules/auth/auth.provider.tsx#L884-L903) to pass `token: token.value` in the mutation variables:
   ```ts
   const ip = await getOrFetchIP();
   const currentToken = token.value;

   return registerSendVerifyEmail({
       variables: {
           ...variables,
           ip,
           token: currentToken,
       } as any,
   })
   ```

## 🧪 Unit / Regression Test

- **Command:** `pnpm test:unit`
- **Results:** PASS (108/108 unit tests across 17 test suites)
- **Linter Check:** `pnpm lint` PASS (0 errors)

## 📝 Lessons Learned

- Always check `registerStep !== E_RegisterStep.COMPLETE` for hooks that require a fully authenticated user session (such as WebSocket event listeners).
- Ensure all multi-step mutation wrappers consistently propagate authentication token variables across every step.
