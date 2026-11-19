# Member 01 verification — 2026-11-19

## Result

62 automated auth tests and 18 browser scenarios passed. Live HTTP checks passed
for the four demo roles. The mobile login form now exposes its primary sign-in
control as an accessible button; this missing role was found during browser QA
and corrected in `mobile/src/screens/LoginScreen.tsx`.

## Automated checks

| Check | Result |
| --- | --- |
| `server: npm run test:signup` | 23/23 passed |
| `web: npm run test:auth` | 20/20 passed |
| `mobile: npm run test:auth` | 19/19 passed |
| `mobile: npx tsc --noEmit` | Passed |
| `server: npm run auth:http` | All four demo roles passed login, profile, staff guard and logout revocation |
| `git diff --check` | Passed |

## Browser interaction checks

Isolated headless Chrome contexts used touchscreen/mobile browser emulation.
These are browser-preview checks, not tests on a physical phone or native Expo.

| Scenario | Evidence / result |
| --- | --- |
| 390 × 844 | Email/password touch focus and typing, show/hide and fixed layout passed |
| 375 × 667 | Same interaction/layout checks passed |
| 320 × 568 | Same interaction/layout checks passed |
| 667 × 375 landscape | Same interaction/layout checks passed |
| Keyboard-sized 390 × 340 viewport | Password focus and value survived resizing; further typing worked |
| Empty login / reset | Correct validation displayed; reset rejected an empty email |
| Customer login | Real existing demo credentials authenticated; Account showed the correct email |
| Customer logout | Returned to the login form; the previous JWT received 401 |
| Dispatcher login | Real demo login opened the protected approval desk |
| Pending courier | Temporary applicant had CUSTOMER role and saw the mobile approval screen |
| Courier approval | Dispatcher approved the temporary application through the actual web UI/API |
| Courier activation | Mobile Check status returned COURIER/APPROVED; the courier workspace and logout worked |
| Merchant approval | Dispatcher approved the second temporary application through the actual web UI/API |
| Merchant activation | Backend returned MERCHANT, APPROVED and a merchant ID; web login routed to `/portal` |
| Review history | Approved tab displayed the saved review note and timestamp |
| Password-reset feedback | Browser request payload and success UI passed with the email response mocked |
| Google initiation | Button produced Supabase OAuth authorization with PKCE and the current preview callback; navigation was intercepted before Google consent |
| Invalid reset link | Displayed the invalid/expired message and did not expose the new-password form |

Two disposable, pre-confirmed `example.invalid` identities were created solely
for approval testing. This avoids sending signup emails and does not test email
confirmation delivery. Actual pending applications were not reviewed or modified.
After tests, the temporary Auth users, profiles, applications and merchant record
were deleted. A follow-up database query confirmed zero remaining test users,
profiles and applications. Temporary login sessions were revoked.

## Artifacts

Local screenshots and detailed output are in the ignored test directory:

- `tmp/auth-browser/login-390x844.png`
- `tmp/auth-browser/login-320x568.png`
- `tmp/auth-browser/login-keyboard-340.png`
- `tmp/auth-browser/customer-account.png`
- `tmp/auth-browser/courier-pending.png`
- `tmp/auth-browser/courier-approved.png`
- `tmp/auth-browser/merchant-approved-web.png`
- `tmp/auth-browser/approval-audit.png`
- `tmp/auth-browser/reset-feedback.png`
- `tmp/auth-browser/reset-invalid-link.png`
- `tmp/auth-browser/results.txt`
- `tmp/auth-browser/approval-results.txt`
- `tmp/auth-browser/recovery-google-results.txt`

## Remaining device/provider checks

Complete Google consent and callback on a physical phone/native build. Verify
actual email confirmation and password-reset delivery, link opening and successful
password change. Native hardware storage and the real on-screen keyboard still
need device testing; browser resize and touch emulation cannot establish those.
