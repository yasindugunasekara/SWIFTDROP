# Member 07 — Phase 04 Plan
## Web Notification Inbox and Notification Preferences

| Item | Value |
|---|---|
| Project | SwiftDrop — Enterprise Courier & Parcel Delivery Management System |
| Module owner | Member 07 |
| Phase | 04 — Web Frontend |
| Backend state | Phase 02 (event processing) and Phase 03 (REST APIs) complete; 61 backend tests + 14 auth regression tests passing |
| Working branch | `pasindu`; no tracked-file changes at inspection time |
| Phase label note | `MEMBER_07_DEVELOPMENT_PLAN.md` calls the frontend work "Phase 05 — Frontend"; this document follows the current brief's "Phase 04" label. The scope is identical. |
| Inspection date | 2026-11-22 |
| Status | **Approved and implemented on 2026-11-22. See the completion report for results and limitations.** |
| Document | `MEMBER_07_PHASE_04_PLAN.md` |

---

## 1. Scope

Implement the web notification inbox and notification preference screen using the existing Phase 03 APIs.

In scope:

- Customer and courier notification inbox at `/inbox`.
- Read/unread visual state, unread count, mark one, mark all.
- Read/unread filtering.
- Cursor-based load-more pagination.
- Loading, empty, error and refresh states.
- Push / email / SMS preference display and update.
- Responsive, accessible UI matching the existing SwiftDrop design.

Out of scope for this phase:

- Mobile application (later phase).
- Backend changes (Phase 02/03 are complete).
- External email/SMS/push provider delivery.
- Rewriting unrelated dashboards.
- New frontend dependencies without approval.

### 1.1 Functional requirement coverage

| Brief requirement | Planned coverage |
|---|---|
| 1. Display a list of notifications | `NotificationInbox` + `GET /notifications` |
| 2. Show title and message | `NotificationCard` renders `title` and `message` as text |
| 3. Show creation time | `formatRelativeTime` with `<time dateTime>` and absolute tooltip |
| 4. Distinguish read/unread | Orange tint, dot and "Unread" label; read cards muted |
| 5. Display unread count | `GET /unread-count` in the header and the Unread filter chip |
| 6. Mark one as read | `PATCH /notifications/:id/read` per-card action |
| 7. Mark all as read | `PATCH /notifications/read-all` toolbar action |
| 8. Pagination / load more | Keyset `nextCursor` + "Load more" button |
| 9. Filter read/unread | All / Unread / Read chips mapped to `isRead` |
| 10. Empty state | `NotificationEmptyState`, role/filter aware |
| 11. Loading and error states | Skeleton cards, `role="alert"` banner, retry, refresh |
| Push / email / SMS preferences | `NotificationPreferences` via GET/PUT `/preferences` |
| No false delivery claims | Always-visible note that external providers are not connected |

### 1.2 Inspection verification

Performed on 2026-11-22 with read-only inspection:

- Read `MEMBER_07_DEVELOPMENT_PLAN.md`, the full `web/` file inventory, key frontend files (root layout, auth store, API proxy, `AuthBoundary`, `Navbar`, inbox, courier, customer, merchant and support pages), both web test files, and the Phase 03 notification backend.
- Confirmed the API is mounted at `server/src/app.ts:56` as `/api/v1/notifications`, with `CUSTOMER`/`COURIER` enforced at `server/src/modules/notifications/notification.routes.ts:76-77`.
- Confirmed response DTOs in `notification.types.ts:68-109` and preference shapes in `notification.service.ts:451-458`.
- Confirmed `web/node_modules` is absent; `server/node_modules` and `server/dist` are present.
- `git status --porcelain` shows only the untracked plan document. No source file has been changed.

---

## 2. Existing frontend architecture (inspection)

### 2.1 Stack

| Concern | Implementation |
|---|---|
| Framework | Next.js 16.4.3 App Router |
| UI library | React 19.3 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 3.4 + a few CSS modules for auth/loading |
| Icons | Inline SVG (no icon package) |
| Auth | Supabase SDK + the project's external auth store |
| HTTP | Shared `fetchApi` wrapper |
| API hosting | Next route handler proxies `/api/v1/*` into the Express app |
| Tests | `node:test` scripts under `web/tests/` (no React Testing Library / jsdom) |

`web/node_modules` is **not installed** in this working copy. Development requires `npm ci` (or `npm install`) inside `web/` first.

### 2.2 Relevant files

| File | Role |
|---|---|
| `web/src/app/layout.tsx` | Root layout; mounts `Navbar` + `AuthBoundary` around every page |
| `web/src/components/layout/AuthBoundary.tsx` | Client-side session restore and path→role gate |
| `web/src/components/layout/Navbar.tsx` | Public marketing navbar; hides itself on dashboard routes including `/inbox` |
| `web/src/lib/auth.ts` | Session store: `getStoredUser`, `subscribeAuth`, `dashboardFor`, `clearAuthSession` |
| `web/src/lib/api.ts` | `fetchApi<T>(endpoint, options)` — Bearer token, one 401 refresh retry, JSON error extraction |
| `web/src/lib/supabase.ts` | Supabase browser client |
| `web/src/pages/api/[...path].ts` | Passes `/api/v1/*` to the compiled Express app |
| `web/src/components/ui/LoadingState.tsx` | Shared spinner/brand loading component |
| `web/src/app/globals.css` | Tailwind entry + base slate background |
| `web/tailwind.config.ts` | Brand orange palette + system font |
| `web/tests/auth-session.test.mjs` | Pure auth/API-module tests via TypeScript transpile + VM |
| `web/tests/same-origin-api.test.mjs` | Live Next API smoke tests |

### 2.3 Auth and API flow

```
Browser page
   │  useSyncExternalStore(subscribeAuth, getStoredUser)   ← current user + role
   │
   ├─ fetchApi('/notifications?...')
   │      ├─ getAccessToken() from the Supabase browser session
   │      ├─ Authorization: Bearer <token>
   │      ├─ on 401: refreshAccessToken() once, retry
   │      └─ throws Error(errorData.error) on other failures
   │
   └─ /api/v1/notifications/... in Next
          └─ Express router → authenticateToken → requireRoles(['CUSTOMER','COURIER'])
                 └─ PostgreSQL, scoped by req.user.id
```

`AuthBoundary` already handles:

- restoring the session on navigation,
- redirecting unauthenticated users to `/login`,
- redirecting merchants awaiting approval,
- showing "Access denied" when the role is not allowed for a path.

### 2.4 Existing notification-related routes and components

| Location | Current state |
|---|---|
| `web/src/app/(customer)/inbox/page.tsx` | **150-line mock**: three hardcoded notifications, local-only checkboxes, `alert()` save |
| `web/src/components/layout/AuthBoundary.tsx:10` | `'/inbox': ['CUSTOMER']` — couriers are currently denied |
| `web/src/components/layout/Navbar.tsx:15` | `/inbox` is already listed as a dashboard route (navbar hides correctly) |
| `web/src/app/(customer)/booking/page.tsx:626-637` | Decorative notification bell `<button>` (title at line 627) with a static orange dot; no link |
| `web/src/app/(courier)/tasks/page.tsx:443-461` | Sidebar buttons driven by local `activeNav` state; no `/inbox` link |
| `web/src/app/tracking/[id]/page.tsx` | Public tracking page is a local demo (hardcoded timeline), so notification cards must not imply live tracking |

There is **no** shared notification component, no notification API client in `web/`, and no toast/empty-state component library.

### 2.5 Existing UI patterns to follow

| Pattern | Existing example |
|---|---|
| Page shell | `history/page.tsx`: brand header, "Notification Centre"-style pill, back link, `max-w-6xl` main |
| Cards | `rounded-2xl` / `rounded-3xl`, `border border-slate-100`, subtle shadow |
| Brand colour | `#ff6600`, orange-50 tints, `font-black` headings |
| Filters | `OrdersPanel.tsx`: chips with `aria-pressed` |
| Empty state | `OrdersPanel.tsx`: centred title + explanatory text; `exceptions/page.tsx` simple card |
| Error state | `OrdersPanel.tsx`: `role`-less red text + "Try again"; auth pages use `role="alert"` |
| Loading | `LoadingState.tsx` (`role="status"`, `aria-live="polite"`) |
| Inline syncing | `exceptions/page.tsx`: "Syncing..." orange pulse text |
| Responsive grids | `grid-cols-1 lg:grid-cols-12`, mobile-first padding |

---

## 3. Decision: shared page and shared components

**Recommendation: one shared `/inbox` route and shared components for CUSTOMER and COURIER.**

Reasons:

1. The Phase 03 API is identical for both roles and is scoped by the authenticated token. There is no role-specific endpoint.
2. Duplicating the page for couriers would duplicate fetching, pagination, error handling and preference logic, and would drift over time.
3. The only real differences are wording ("Delivery alerts" vs "Assignment alerts"), empty-state copy, and the back-link destination (`dashboardFor(user.role)`).
4. `AuthBoundary` can allow both roles for `/inbox` with a one-line change.
5. Shared components can later be composed into a different courier layout if the team wants one.

**Keep the page file where it is** (`web/src/app/(customer)/inbox/page.tsx`). Route groups do not appear in the URL, so this already serves `/inbox`. Moving it would be churn and risks a duplicate-route conflict. The folder name is organizational only.

**Do not create** `web/src/app/(courier)/inbox/page.tsx` — it would collide with the existing `/inbox` URL.

---

## 4. API integration approach

### 4.1 Existing client only

Reuse `web/src/lib/api.ts` → `fetchApi`. Do **not** add a second HTTP client, Axios, SWR or React Query.

`fetchApi` already:

- reads the Supabase access token,
- retries once after a refresh on 401,
- clears the session if the refresh fails,
- parses `{ error }` / `{ message }` into a thrown `Error`,
- returns typed JSON.

### 4.2 New typed wrapper

Create `web/src/lib/notifications.ts`:

```ts
export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
  parcelId: string | null;
  trackingNumber: string | null;
  deliveryChannels: string[];
}

export interface NotificationListResponse {
  notifications: NotificationItem[];
  count: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  updatedAt: string;
}

export const listNotifications = (params: {
  limit?: number;
  cursor?: string;
  isRead?: boolean;
}): Promise<NotificationListResponse>;

export const getUnreadCount = (): Promise<{ unreadCount: number }>;
export const markNotificationRead = (id: string): Promise<{ message: string; notification: NotificationItem }>;
export const markAllNotificationsRead = (): Promise<{ message: string; updatedCount: number }>;
export const getNotificationPreferences = (): Promise<{ preferences: NotificationPreferences }>;
export const updateNotificationPreferences = (
  patch: { pushEnabled: boolean; emailEnabled: boolean; smsEnabled: boolean },
): Promise<{ message: string; preferences: NotificationPreferences }>;
```

Implementation notes:

- Build the query string with `URLSearchParams`; omit `undefined` values.
- `limit` = 20 (backend default, max 50).
- Map the UI filter: `all` → omit `isRead`; `unread` → `isRead=false`; `read` → `isRead=true`.
- `markNotificationRead` uses `encodeURIComponent(id)` in the path.
- The preferences UI sends **all three booleans** on save, which is valid strict PUT semantics even though the backend also accepts partial bodies.

### 4.3 Pure helpers

Create `web/src/lib/notification-format.ts` with no imports, so it is easy to unit test:

- `buildNotificationQuery({ limit, cursor, isRead })`.
- `formatRelativeTime(iso: string, now?: Date)` — `Intl.RelativeTimeFormat` (minutes/hours/days), with a full absolute date in the `title`.
- `formatAbsoluteDate(iso: string)` — locale date/time for the tooltip.
- `notificationTypeMeta(type: string)` — label, tone (orange/green/red/blue/slate) and SVG key.
- `mergeNotificationPages(existing, incoming)` — append while de-duplicating by `id`.
- `notificationEmptyCopy(role, filter)` — role/filter-aware empty text.

No external date library.

### 4.4 Backend response shapes used

| Endpoint | Response |
|---|---|
| `GET /notifications?limit=20&isRead=false&cursor=...` | `{ notifications, count, nextCursor, hasMore }` |
| `GET /notifications/unread-count` | `{ unreadCount }` |
| `PATCH /notifications/:id/read` | `{ message, notification }` |
| `PATCH /notifications/read-all` | `{ message, updatedCount }` |
| `GET /notifications/preferences` | `{ preferences: { pushEnabled, emailEnabled, smsEnabled, updatedAt } }` |
| `PUT /notifications/preferences` | `{ message, preferences }` |

The backend returns 400 (validation), 401 (session), 403 (role), 404 (foreign/missing notification) and 500 (generic). The UI maps these to inline messages without exposing internals.

These shapes were re-read from `notification.routes.ts`, `notification.service.ts` and `notification.types.ts`. `GET /notifications/inbox` exists only as a deprecated alias; the frontend will call `/notifications`.

---

## 5. Authentication and role handling

1. `AuthBoundary` restores the session and gates `/inbox`.
2. **Required shared-file change:** `AuthBoundary.tsx:10` becomes:

   ```ts
   '/inbox': ['CUSTOMER', 'COURIER'],
   ```

   This is the only change needed to let couriers reach the page. It is a shared layout file, so it must be coordinated before merging.

3. The page reads the user with the existing store:

   ```ts
   const user = useSyncExternalStore(subscribeAuth, getStoredUser, () => null);
   ```

   It uses `user.role` only for copy and the back-link target (`dashboardFor(user.role)`). It never sends a user id to the API.

4. `fetchApi` attaches the Bearer token. On a 401 it attempts one refresh; if the session is gone, `AuthBoundary` redirects to `/login`.
5. No user IDs, tokens or notification payloads are stored in `localStorage`.
6. Notification text is rendered as React text nodes; **no `dangerouslySetInnerHTML`**.
7. A 403 (should not occur for an allowed role) is displayed as an error; it is not retried.

---

## 6. Files to create and modify

### 6.1 Create

| File | Purpose |
|---|---|
| `web/src/lib/notifications.ts` | Typed API wrapper over `fetchApi` |
| `web/src/lib/notification-format.ts` | Pure formatting, query and metadata helpers |
| `web/src/components/notifications/NotificationCard.tsx` | One notification card: type icon, title, message, time, read state, tracking number label (no link while the public tracking page remains a mock), mark-read button |
| `web/src/components/notifications/NotificationInbox.tsx` | List, filter chips, unread count, refresh, mark-all, load-more, loading/error/empty states |
| `web/src/components/notifications/NotificationPreferences.tsx` | Three channel toggles, load/save, success/error feedback |
| `web/src/components/notifications/NotificationSkeleton.tsx` | Animated skeleton cards for initial/loading-more states |
| `web/src/components/notifications/NotificationEmptyState.tsx` | Role/filter-aware empty state with refresh |
| `web/tests/notification-helpers.test.mjs` | Unit tests for the pure helpers (existing `node:test` + TypeScript transpile pattern) |

Optional (only if the components grow): split `NotificationTypeIcon` into its own file. Start without it.

### 6.2 Modify

| File | Change |
|---|---|
| `web/src/app/(customer)/inbox/page.tsx` | Replace the mock page with the real inbox + preferences screen |
| `web/src/components/layout/AuthBoundary.tsx` | Add `'COURIER'` to `/inbox` (one line) |
| `web/tests/same-origin-api.test.mjs` | Add unauthenticated notification endpoint smoke checks |

### 6.3 Proposed (needs team approval — not part of the core implementation)

| File | Change | Why it needs coordination |
|---|---|---|
| `web/src/app/(customer)/booking/page.tsx` | Turn the decorative bell `<button>` into `<Link href="/inbox">` and optionally show the unread count | Member 02's dashboard |
| `web/src/app/(courier)/tasks/page.tsx` | Add a "Delivery Inbox" link to the sidebar | Member 04's dashboard; its sidebar uses local state, not routes |

Without these links, `/inbox` is still reachable directly and via the browser URL. The plan recommends the two small link changes, but will not touch those pages until approved.

### 6.4 Do not modify

- `web/src/lib/api.ts`, `web/src/lib/auth.ts`, `web/src/lib/supabase.ts`.
- `web/src/components/layout/Navbar.tsx` (it already hides on `/inbox`).
- Any backend file, any other member's module, the mobile app.
- No new npm dependencies.

---

## 7. UI design and responsive layout

### 7.1 Page structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ swiftdrop.   Notification Centre                    ← Back to dashboard │
├──────────────────────────────────────────────────────────────────────┤
│  Delivery alerts                                      [3 unread]      │
│                                                                      │
│  ┌─────────────┬───────────────┐                                    │
│  │ Inbox       │ Preferences   │   (accessible tabs)                │
│  └─────────────┴───────────────┘                                    │
│                                                                      │
│  ── Inbox tab ───────────────────────────────────────────────────    │
│  [ All ] [ Unread 3 ] [ Read ]          [Refresh] [Mark all read]    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ ●  🚚 Out for delivery                          10 min ago   │    │
│  │    Your parcel SWIFT-991122 is out for delivery.            │    │
│  │    SWIFT-991122 · Channels: PUSH, EMAIL       [Mark read]   │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │    ✓ Parcel delivered                           2 hours ago  │    │
│  │    Your parcel SWIFT-991122 has been delivered.              │    │
│  │    SWIFT-991122                                             │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                      │
│  [ Load more ]                                                       │
│                                                                      │
│  ── Preferences tab ─────────────────────────────────────────────    │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Channel preferences                                          │    │
│  │ Push notifications      [switch]  In-app alerts on this device│    │
│  │ Email notifications     [switch]  Email updates when available│    │
│  │ SMS notifications       [switch]  SMS updates when available  │    │
│  │                                                              │    │
│  │ [ Save preferences ]                                         │    │
│  │ Preferences saved ✓                                          │    │
│  │                                                              │    │
│  │ Note: Email, SMS and push providers are not connected in     │    │
│  │ this release. These settings record your delivery intent.    │    │
│  │ Your in-app inbox always records parcel updates.             │    │
│  └──────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

### 7.2 Visual language

- White cards on `bg-slate-50` / `bg-white`, `rounded-2xl`/`rounded-3xl`, `border-slate-100`.
- Brand orange `#ff6600` for unread indicators, active tabs, primary buttons, focus rings.
- Unread cards: pale orange background (`bg-orange-50/40`) + orange dot + stronger title weight.
- Read cards: white, muted metadata, normal title weight.
- Type badges: small coloured icon chip:
  - booked: slate/orange
  - assigned/picked up: blue
  - in transit/out for delivery: orange
  - delivered: emerald
  - failed: red
- Typography: `font-black` headings, `text-xs`/`text-sm` body, matching the existing dashboards.
- No new fonts or icon libraries; inline SVGs.

### 7.3 Responsive behaviour

| Breakpoint | Layout |
|---|---|
| Mobile (<640px) | Single column, full-width tabs, cards stacked, filter chips wrap, 16px page gutters |
| Tablet (640–1024px) | Single column, wider cards, filters and actions on one row where space allows |
| Desktop (>1024px) | `max-w-5xl` content column, same tabs, wider cards; optional 8/4 split for inbox + summary is not required |

Touch targets at least 44px. No horizontal page scroll.

### 7.4 Accessibility

- Tabs: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-controls`, `role="tabpanel"`, with Left/Right arrow-key movement and a roving `tabIndex`. If arrow-key handling is not implemented, use two `aria-pressed` buttons and conditionally rendered panels instead of half-implemented tab roles.
- Filter chips: native `<button>` with `aria-pressed`.
- Preference switches: native `<input type="checkbox" role="switch">` with visible labels and descriptions, or a button with `role="switch"` and `aria-checked`; keyboard operable.
- Status/success: `role="status"` + `aria-live="polite"`.
- Errors: `role="alert"`.
- Loading: `aria-busy` on the list; `role="status"` text for screen readers.
- Times: `<time dateTime={createdAt}>` with a descriptive `title` for the absolute time.
- Visible `focus-visible` rings in brand orange.
- Read/unread state is conveyed by text and icon, not colour alone.

---

## 8. State, loading, error and pagination handling

### 8.1 `NotificationInbox` state

| State | Purpose |
|---|---|
| `items` | Loaded notifications |
| `filter` | `'all' \| 'unread' \| 'read'` |
| `unreadCount` | From `/unread-count` |
| `nextCursor` / `hasMore` | Keyset pagination |
| `status` | `'loading' \| 'ready' \| 'error'` for the first page |
| `isLoadingMore` | Load-more pending |
| `isRefreshing` | Toolbar refresh pending |
| `error` | Inline error message |
| `pendingReadIds` | Set of ids with an in-flight mark-read |
| `isMarkingAll` | Mark-all pending |

### 8.2 Behaviour

- **Initial load:** skeleton cards + `aria-busy`; fetch the first page and the unread count in parallel (`Promise.all`).
- **Filter change:** reset items/cursor, show skeletons, fetch page 1 with the mapped `isRead`. A request sequence counter prevents a stale response from overwriting a newer filter.
- **Refresh:** re-fetch page 1 + unread count, keep existing items visible while refreshing, show a small "Refreshing..." indicator.
- **Load more:** call the API with `nextCursor`, append with de-duplication by id, update `nextCursor`/`hasMore`. Button shows "Loading more..." and is disabled while pending.
- **Mark one:** per-card button with pending state. On success, replace the item with the API's returned notification and refresh the unread count. Under the `unread` filter, remove the item after a brief in-place read state so the list stays consistent, and announce the change with `role="status"`. On error, keep the item unread and show an inline error.
- **Mark all:** disabled when `unreadCount === 0` or while pending; also disables per-card mark-read actions while pending. On success, mark all loaded items as read, set the unread count to 0, announce how many were updated, and refresh the first page if the current filter is `unread`. On error, show an inline error.
- **Empty:** if the first page returns no rows, show `NotificationEmptyState` with role/filter-aware copy and a "Refresh" button.
- **Error:** keep any already-loaded items; show an `role="alert"` banner with the backend message and "Try again". Never replace the whole page with an unhandled error.
- **Unauthorised:** `fetchApi` clears the session on a failed refresh; `AuthBoundary` redirects. No manual token manipulation.
- **Stale requests:** a request counter (or `AbortController` passed through `fetchApi`) discards responses from an older filter/refresh.

### 8.3 `NotificationPreferences` state

- `preferences` (saved), `draft` (current toggles), `isLoading`, `isSaving`, `error`, `successMessage`.
- Load on mount; show a small `LoadingState` inline or skeleton rows.
- Save sends **all three** booleans; on success set both `preferences` and `draft` from the response and show "Preferences saved."
- Save is disabled when there are no changes or while saving.
- On error, keep the draft and show `role="alert"`; offer "Try again."
- The note about external providers is always visible; no delivery claim is made.

---

## 9. Security

| Requirement | Implementation |
|---|---|
| Use the existing authenticated client | `fetchApi` only |
| Never hardcode user ids | No user id appears in any request |
| Never bypass auth | `AuthBoundary` + backend `authenticateToken` |
| Role restrictions | `AuthBoundary` allows CUSTOMER/COURIER; backend enforces the same |
| No cross-user data | Backend scopes by token; UI never requests another user |
| Expired sessions | `fetchApi` refreshes once, then clears; `AuthBoundary` redirects |
| Sensitive data storage | In-memory React state only; no notifications in localStorage |
| XSS | React text rendering; no `dangerouslySetInnerHTML` |
| Errors | Show backend `error` text; never print tokens or stack traces |
| Links | Tracking numbers render as plain text; no tracking link while `tracking/[id]` is a local demo. Any future link must `encodeURIComponent` the value. |

---

## 10. Testing strategy

The project has no React component testing framework (no RTL/jsdom/Vitest). **Do not add one in this phase without approval.** Use the existing conventions.

### 10.1 Pure helper tests (new)

`web/tests/notification-helpers.test.mjs`, following `auth-session.test.mjs`:

- Transpile `web/src/lib/notification-format.ts` with `typescript.transpileModule` and run it in a VM.
- Test:
  - query builder: all/unread/read, cursor and limit encoding;
  - relative time formatting with a fixed `now` (minutes, hours, yesterday, older);
  - absolute date formatting;
  - type metadata for every known type and an unknown fallback;
  - page merge de-duplicates by id and preserves order;
  - role/filter empty-state copy.

### 10.2 Same-origin API smoke tests (extend)

Add to `web/tests/same-origin-api.test.mjs`:

- `GET /api/v1/notifications` with no token → 401.
- `GET /api/v1/notifications/unread-count` with no token → 401.
- `GET /api/v1/notifications/preferences` with no token → 401.

These run against a production Next server (`npm start -- -p 3101`), as documented in the file. They do not need a database because auth rejects first.

### 10.3 Backend coverage

Phase 03 already covers API semantics with 61 tests, including isolation, pagination, filters, mark-read/all, preferences, validation and unauthenticated requests. Re-run `npm --prefix server run test:notifications` before the frontend demo.

### 10.4 Manual/browser verification checklist

- Customer login → `/inbox` loads their notifications.
- Courier login → `/inbox` loads their assignments/failures; no customer notifications.
- Unread badge matches `/unread-count`.
- All / Unread / Read filters return the expected sets.
- Load more appends without duplicates and ends with `hasMore=false`.
- Mark one updates the card, timestamp and unread count; repeated clicks are safe.
- Mark all updates every card and the count; button disables at 0.
- Preferences load, toggle, save, show success, and persist after reload.
- Initial skeleton, empty state, error state (simulate offline/500), and refresh.
- Mobile 375px, tablet 768px, desktop 1280px.
- Keyboard: tab to filters, cards, buttons, switches; visible focus; Escape not required.
- Session expiry: clearing the Supabase session redirects to `/login`.
- No console errors and no hydration warnings.

### 10.5 Commands

```powershell
npm --prefix web ci          # first time only
npm --prefix server run test:notifications
npm --prefix server run test:signup
npm --prefix web run test:auth
npm --prefix web run test:api      # requires a running Next server
npm --prefix web run build
```

---

## 11. Dependencies and potential conflicts

### 11.1 Dependencies

- **No new npm packages.**
- `web/node_modules` is absent in this working copy; `npm ci` inside `web/` is required before development/testing.
- `next build`/`dev` run `predev`/`prebuild`, which build the server first. The server `dist/` must compile (it does).
- Node 20+ and the existing TypeScript/Tailwind versions are sufficient.

### 11.2 Conflicts / coordination

| Item | Risk | Action |
|---|---|---|
| `AuthBoundary.tsx` (`/inbox` CUSTOMER-only) | Couriers cannot reach the page until changed | One-line shared edit; notify Member 01/layout owner |
| Customer dashboard bell (`booking/page.tsx`) | Decorative button; no link to the inbox | Optional `<Link>` change; coordinate with Member 02 |
| Courier sidebar (`tasks/page.tsx`) | Local `activeNav` state; no inbox link | Optional link; coordinate with Member 04 |
| Courier demo identity switcher | `/tasks` can switch demo identities, while `/inbox` uses the real logged-in courier | Demo as the seeded courier; do not modify their page |
| `/inbox` physical folder `(customer)` | Misleading name but URL is neutral; a `(courier)/inbox` would duplicate the route | Keep one page; document; do not create a courier inbox route |
| Public tracking page `tracking/[id]` | Still a local demo with a hardcoded timeline | Show tracking numbers as text; revisit links when the tracking module is wired |
| `Navbar.tsx` | Already hides on `/inbox`; no change needed | None |
| `fetchApi` / auth store | Shared files; behaviour depends on them | Reuse only; no modification |
| Preferences `PUT` partial semantics | The backend accepts partial bodies; the UI sends all three | No conflict |
| Session/role in tests | Web API smoke tests only cover 401; authenticated UI is manual | Document honestly |

---

## 12. Step-by-step implementation roadmap

1. **Install web dependencies** with `npm ci` in `web/`; confirm the existing app builds.
2. **Add pure helpers** in `web/src/lib/notification-format.ts`; add `web/tests/notification-helpers.test.mjs`; run it.
3. **Add the typed API wrapper** `web/src/lib/notifications.ts`.
4. **Build the card and skeleton components**; verify with temporary development fixtures that are removed before completion.
5. **Build `NotificationInbox`**: first-page load, unread count, filters, pagination, mark-one, mark-all, loading/empty/error/refresh, request-race guard.
6. **Build `NotificationPreferences`**: load, dirty tracking, save, success/error, provider note.
7. **Rewrite `/inbox`** as the page shell: header, brand, back link, role-aware title, tabs, composition. Remove all mock notifications and `alert()` calls.
8. **Update `AuthBoundary`** to allow COURIER for `/inbox` (coordinate).
9. **Extend `web/tests/same-origin-api.test.mjs`** with unauthenticated notification checks.
10. **Run** helper tests, API smoke tests (with a running Next server), `npm --prefix web run build`, and the backend suites.
11. **Manual verification** on desktop/tablet/mobile with customer and courier accounts.
12. **Optional link integrations** after approval: customer bell, courier sidebar.
13. Capture screenshots for the Phase 07 evidence folder.

---

## 13. Open questions for approval

**Resolved on 2026-11-22 by user approval.** Kept below as the planning record.

1. **Shared `/inbox` route for CUSTOMER + COURIER** via a one-line `AuthBoundary` change — approve?
2. **Tabbed layout** (Inbox / Preferences) rather than the current side-by-side mock — approve, or prefer the 8/4 desktop split?
3. **Optional dashboard links** (customer bell, courier sidebar) touch other members' pages — implement with coordination, or defer?
4. **Testing scope**: pure helper tests + unauthenticated API smoke tests + manual browser verification. No React Testing Library/jsdom dependency. Approve, or should the team add a component-testing stack?
5. **`web/node_modules` is absent** — approve running `npm ci` inside `web/` as the first implementation step?
6. **Preferences save** sends all three booleans (strict PUT style), even though the backend accepts partial updates. Approve?

---

## 14. Confirmation

At planning time this document was the only artefact and no application source was modified. Phase 04 was subsequently approved and implemented on 2026-11-22. See the completion report for the created/modified file list, test results and limitations. Mobile development has not been started.
