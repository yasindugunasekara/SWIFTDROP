# Member 01: Identity and account security

Web and mobile share Supabase Auth and the same verified backend profile. The
database profile determines the user's role; presentation tabs, callback URLs
and editable Auth metadata cannot grant access. Kubernetes is outside this change.

## User flows

- Web `/register`: Customer signup, or Courier/Business application with contact,
  delivery area, vehicle or business registration details. Confirm email, then
  sign in. An application starts as a Customer identity with no operational role.
- Mobile Register offers the same three account types. Customer/Courier are the
  supported mobile workspaces; approved merchants use the web portal.
- Pending/rejected applicants see an approval screen, including the staff review
  note. Check status reloads the verified backend profile. Approved couriers enter
  tasks, and approved merchants enter the portal without changing client claims.
- Dispatcher/Admin opens **Account Approvals** from Dispatch, or visits
  `/account-applications`. Review the saved details, add a 3–500 character note,
  and Approve or Reject. Tabs show pending and previously reviewed applications.
- Approving atomically grants the requested role, copies the contact phone, and
  creates an approved merchant record when applicable. Rejecting leaves the
  identity as Customer. Reviewer, note and time are recorded. A reviewed
  application cannot be reviewed again. Applicants cannot edit their snapshot,
  see another applicant's data or approve themselves.
- Web Forgot Password sends a generic reset response. Mobile uses the email
  entered on Login and sends the same request. Open the email link in the web
  reset page, choose a matching password (8 characters minimum, 72 UTF-8 bytes
  maximum), then sign in again. The page verifies the Auth session and globally
  signs out after a successful password change.
- Demo buttons authenticate pre-provisioned accounts through the real login
  provider. Web offers Customer, Courier, Merchant and Dispatcher. Mobile offers
  Customer and Courier. No password or service-role key is sent to clients.

## Configuration

`server/.env` needs `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `APP_URL`. Local Next
loads this file via `next.config.ts`; hosted web/API deployments need their own
environment values. Supabase owns credential hashing and token issuance. The
application does not hash passwords a second time or issue replacement JWTs.

Apply `server/src/database/migrations/20261119095136_account_application_approvals.sql`
after the existing profile and active-session migrations. It was applied to the
connected SWIFTDROP project on 2026-11-19. It also recovers older registration
applications as pending; changing Auth metadata later does not change a snapshot.
The private review function checks both current staff role and active session;
the public RPC wrapper uses invoker security. Application records have RLS and
authenticated SELECT only; writes happen through the trigger/review function.

Demo shortcuts are disabled unless `AUTH_DEMO_ENABLED=true` on the server. This
was enabled in the local server `.env` for examiner use. They intentionally grant
access to demo accounts, so enable them only in a demo environment. Optional
`DEMO_CUSTOMER_PASSWORD`, `DEMO_COURIER_PASSWORD`, `DEMO_MERCHANT_PASSWORD` and
`DEMO_DISPATCHER_PASSWORD` override the existing sample passwords. Provision a
separate project's demo identities using the reviewed test-only seed, never by
relaxing signup role rules. Do not run the legacy sample migration to reset users.

### Google and email redirect configuration

Enable the Google provider in Supabase, with the Google client credentials in the
provider dashboard. Google must allow the Supabase callback
`https://<project-ref>.supabase.co/auth/v1/callback`.

In Supabase Auth URL Configuration allow:

- `http://localhost:3000/auth/callback` and the deployed web callback.
- `http://localhost:3000/reset-password` and the deployed reset page.
- `swiftdrop://auth/callback` for native mobile OAuth.
- `http://localhost:8081/auth/callback` when using the Expo web preview.

Native Google OAuth uses PKCE, the `swiftdrop` scheme, an external auth browser
and SecureStore. Activate the existing **Before User Created** hook
`public.swiftdrop_google_existing_accounts_only` in Supabase Auth Hooks before
setting `EXPO_PUBLIC_GOOGLE_EXISTING_ONLY_READY=true` in mobile `.env`. This hook
rejects creation of new Google-only accounts; an existing account must be
registered first. The mobile app retains that setup guard. Rebuild native apps
after adding native plugins or changing their configuration. Expo web preview
does not verify device SecureStore or native callback handling.

Email confirmation is enabled. Configure SMTP and the reset email template to
use Supabase's confirmation URL so its verified recovery link reaches the allowed
reset page. No reset request accepts a client-controlled redirect URL.

## API contract

All routes are under `/api/v1/auth`. Auth responses use `Cache-Control: no-store`.

| Method | Route | Request / response |
| --- | --- | --- |
| GET | `/config` | Public Supabase URL and publishable/anon key only |
| POST | `/register` or `/signup` | `{fullName,email,password,confirmPassword,role?:"CUSTOMER"}` |
| POST | `/register-application` | Credentials plus `application:{role:"COURIER"|"MERCHANT",phone,address,...roleDetails}`; returns 202 and `requiresApproval:true` |
| POST | `/login` | `{email,password}` → `{user,accessToken,refreshToken,expiresAt}` |
| POST | `/refresh` | `{refreshToken}` → verified session |
| POST | `/logout` | Bearer token; revokes the current session |
| GET / PATCH | `/me` | Bearer token; current profile / safe name and phone updates |
| POST | `/forgot-password` | `{email}` → generic message regardless of account existence |
| GET | `/demo` | `{roles:[...]}`; empty when disabled |
| POST | `/demo` | `{role}` → real demo session; 404 when disabled |
| GET | `/applications?status=PENDING` | Staff bearer token → `{applications:[...]}`; at most 100 oldest first |
| PATCH | `/applications/:id` | Staff bearer token, `{decision:"APPROVED"|"REJECTED",note}` → saved decision |

Example staff decision:

```json
{"decision":"APPROVED","note":"Registration and contact details checked."}
```

Missing/invalid/expired sessions return 401, unauthorized roles return 403,
invalid request bodies return 400 and a repeated decision returns 409. Passwords
and backend credentials are never returned. The legacy dispatch merchant approval
endpoint now calls the existing merchant service rather than reporting fake
success; new account applications use the audited review endpoint above.

## Verification evidence (2026-11-19)

```powershell
cd server
npm run test:signup
npm run auth:check -- --demo
npm run auth:http
cd ../web
npm run test:auth
npm run build
cd ../mobile
npm run test:auth
npx tsc --noEmit
```

- Backend: 23 automated tests cover validation, token/session checks, role
  escalation, reset request validation, demo gating, application snapshot/RLS,
  self-approval prevention, staff approval/rejection, merchant creation and audit.
- Web: 20 automated tests cover refresh/logout races, Google callback errors,
  five-role routing, pending/rejected routing, recovery session verification,
  matching/UTF-8 password rules, global signout and demo session establishment.
- Mobile: 19 automated tests cover secure chunk storage, refresh/logout races,
  role restrictions, Google PKCE outcomes, demo login and password reset requests.
- Live hosted check: Google provider enabled and email confirmation required;
  all four existing demo accounts passed login, current-profile verification and
  immediate post-logout JWT rejection. Test sessions were revoked.
- Hosted approval migration applied; RLS enabled with an application read policy.
  The security advisor reported no new application-table finding; pre-existing
  unrelated-table informational notices and password-protection settings remain.
- Run `npm run auth:http` while web runs on port 3000 to check the actual demo
  endpoint, profile lookup, staff-only approval access, logout revocation and new
  route responses. Set `SWIFTDROP_AUTH_ORIGIN` to target another running origin.
  The script does not register users or send reset emails.
- Live HTTP check passed for all four demo roles, the staff-only applications
  endpoint, logged-out JWT rejection, reset request validation and new page routes.
- Production web build, mobile TypeScript check and targeted web auth lint passed.
  Next.js emitted a security upgrade recommendation; dependencies were not changed
  as part of this account feature work.
- Web (`http://localhost:3000/login`), Expo web preview (`http://localhost:8082`)
  and API (`http://localhost:5000/health`) were started and returned HTTP 200.
  The initial Computer Use visual check stopped on a browser URL policy check.
  Later isolated headless Chrome tests verified actual touch typing, login/logout,
  pending-to-approved transitions and review history. See the detailed
  [verification report](member-01-verification.md) for all 18 browser scenarios.

Provider settings and automated SDK boundary tests do not establish that someone
completed an interactive Google consent flow on a physical device. Final examiner
checks should include native Google consent/cancel, email reset delivery and link
opening, and registration email confirmation. Live approval transitions were
verified using temporary pre-confirmed test accounts; actual email delivery was
not exercised.
