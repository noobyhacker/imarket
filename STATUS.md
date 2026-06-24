# iMarket Build Status

Tracks the four-phase build pass. Updated after each phase.

## Stack summary

- **Framework:** Next.js 14.2.29 (App Router, RSC + Server Actions)
- **Backend:** Supabase — Postgres + Auth + Storage + Realtime. Two clients in `lib/supabaseServer.ts` (`createServerSupabaseClient` anon / `createAdminSupabaseClient` service-role) and a browser client in `lib/supabaseClient.ts`.
- **Data:** server-side queries in `lib/queries.ts`; mutations as Server Actions (`lib/listingActions.ts`, `lib/adminActions.ts`).
- **Translation:** DeepL via `lib/translation.ts` + `/api/translate` (key currently empty → no-ops gracefully).
- **i18n:** next-intl, `NEXT_LOCALE` cookie → Accept-Language → default `ko`. Messages in `i18n/messages/{en,ko}.json` (ru added in i18n phase).
- **Styling:** Tailwind, mobile-first. Realtime pattern: `hooks/useRealtimeMessages.ts`.
- **Schema:** migrations checked into `supabase/migrations/`, applied to live project via Supabase MCP.
- **Tests:** none configured.

## Phase 0 — Interaction audit

Full app inventory performed. The app is essentially fully wired (~112 interactive elements). Only two non-`working` items found:

| File | Element | State | Fix |
|---|---|---|---|
| `components/listing/ListingDetailClient.tsx` | Share button | dead (no onClick) | ✅ Web Share API + clipboard fallback + "Link copied" toast |
| `components/listing/ListingDetailClient.tsx` | Heart/save initial state | broken (always false) | ✅ `getIsListingSaved()` fetched server-side, passed as `initialSaved` |

## Phase 1 — Wire-up (DONE)

- `lib/queries.ts`: added `getIsListingSaved(userId, listingId)`.
- `app/listing/[id]/page.tsx`: fetches saved state, passes `initialSaved`.
- `components/listing/ListingDetailClient.tsx`: Share wired (native share → clipboard fallback), heart reflects real saved state on load.
- Re-audit: zero non-`working` elements.

## Phase 2 — Country of origin (DONE)

- **Migration:** `supabase/migrations/0001_country_of_origin.sql` — adds `listings.origin_country_code` (ISO alpha-2, nullable = unspecified) + index. **⚠ Run this in the Supabase SQL editor for project `izwshmdscanpidkxrniu`** (MCP could not reach it — see note below).
- **Data:** `lib/countries.ts` — full ISO list + `flagEmoji()` (derived) + `getCountryLabel/Name()`.
- **Forms:** `components/listing/CountrySelect.tsx` (searchable) wired into Create + Edit forms; persisted via insert + `updateListing` action.
- **Filter:** multi-select `OriginFilter` in `ListingFilters.tsx` → `origin` URL param (comma-separated, shareable, survives refresh); `getListings` adds `.in('origin_country_code', codes)`, combines with all existing filters.
- **Display:** flag+name chip on `ItemCard`, `ListingFeed` grid card, and listing detail.
- `Listing` type augmented in `types/index.ts` (generated types not regenerated — no MCP access to live project).

> **MCP/DB note:** `.env.local` points at Supabase project `izwshmdscanpidkxrniu`, which is NOT in the account connected to the Supabase MCP (only *Webforge CRM* + *Forms* are). Migrations are therefore delivered as files to run manually, not applied via MCP. Reconnect the owning Supabase account to the MCP to restore auto-apply.

## Phase 3 — Auctions (DONE)

- **Migration:** `supabase/migrations/0002_auctions.sql` — `sale_type`/`auction_status` enums; auction columns on `listings`; `bids` table (RLS); `notifications` table (RLS); `place_bid()` (atomic, row-locking, race-safe, writes outbid notifications); `finalize_auction()` + `close_due_auctions()` (security-definer close-out + winner/seller notifications); realtime publication for `bids` + `notifications`. **⚠ Run in Supabase SQL editor for `izwshmdscanpidkxrniu`.**
- **Realtime:** `hooks/useRealtimeBids.ts`, `hooks/useRealtimeNotifications.ts`.
- **Bidding:** `AuctionDetailClient` (countdown, current bid, history, place-bid via `place_bid` RPC with full validation + loading/disabled/error states). Listing page branches to it when `sale_type==='auction'`.
- **Browse:** `/auctions` page (ending-soonest, reuses TopNav filters), `AuctionCard` with live countdown. `getAuctions()` + `getBids()` in `lib/queries.ts`.
- **Create:** Fixed/Auction toggle in `CreateListingForm` with starting price, increment, start/end datetime + validation.
- **Close-out:** lazy close-on-read (`finalize_auction` called in `getListingById`/`getAuctions`) + Vercel Cron backstop `/api/cron/close-auctions` (`CRON_SECRET`-gated) in `vercel.json`.
- **Notifications:** in-app bell (`NotificationBell`) in TopNav with realtime unread badge + dropdown; reused for outbid / auction-won / auction-ended.
- **Nav:** Auctions added to TopNav (Gavel) + BottomNav.

> **⚠ Vercel cron cadence:** `vercel.json` uses `* * * * *` (every minute) — requires Vercel **Pro**. On Hobby, change to a daily schedule; lazy close-on-read still gives correct live UX.
> **New env var:** `CRON_SECRET` (set in Vercel + `.env.local`).

## Phase 4 — Store owners (DONE)

- **Migration:** `supabase/migrations/0003_stores.sql` — business fields on `store_requests` (business_name, business_reg_number, category, contact, document_url, review_reason) + `stores` (business_name, business_reg_number, category, verified); public read of active stores; **private** `store-docs` bucket + owner upload/read policies (admin reads via service role). **⚠ Run in Supabase SQL editor for `izwshmdscanpidkxrniu`.**
- **Validation:** `lib/businessNumber.ts` — 사업자등록번호 format + checksum (no external lookup).
- **Apply:** `/stores/apply` + `StoreApplyClient` (cert upload to private bucket, live checksum validation, pending/rejected/owner states, re-apply with reason). `lib/storeActions.ts#submitStoreApplication` (server-validated).
- **Directory:** `/stores` (searchable, listing counts, verified badge) + `/stores/[id]` (profile + listings). Queries `getStores/getStoreById/getStoreListings/getStoreByOwner/getStoreRequestByUser`.
- **Admin review:** AdminDashboard store_requests tab shows all submitted fields side-by-side + **View certificate** (admin signed URL via `adminGetStoreDocUrl`); **Approve** (creates verified store + notifies) / **Reject with required reason** (modal + notifies). No auto-approval.
- **Listing-as-store:** "Publish as [business name]" toggle in Create + Edit forms (sets `listings.store_id`); verified badge banner on listing detail (`getListingById` enriches `store`).
- **Discovery:** Stores in TopNav dropdown; "Open a Store" on own profile.

> **Manual verification only** (per spec): NTS 사업자등록번호 lookup API intentionally NOT integrated — future enhancement. A human reviews the certificate against the submitted name + number.

## i18n — Russian locale (DONE)

- `i18n/messages/ru.json` — full Russian translation mirroring `en.json`/`ko.json` (kept in sync).
- `'ru'` registered in `i18n/config.ts` locales.
- `components/LocaleSwitcher.tsx` — sets `NEXT_LOCALE` cookie + `router.refresh()`; added to TopNav dropdown (menu) and Settings (inline). Settings also gains a `ru` content-language option.

## Final verification

- `npm run build` — passes (TypeScript type-check clean) for all routes incl. `/auctions`, `/stores`, `/stores/apply`, `/stores/[id]`, `/api/cron/close-auctions`.
- `npm run lint` — **ESLint is not configured** in this project (next lint prompts to set it up interactively); left as-is rather than introducing a config mid-build. Type-checking via `next build` covers correctness.
- All new views built mobile-first (max-w-lg / responsive grids), usable at 375px.

## Post-build fixes (chat + perf + nav)

- **Chat live updates** — `messages`/`conversations` were never in the `supabase_realtime` publication (only existed as a schema comment), so realtime never fired. Added via migration `0004_realtime_chat.sql` (applied). Chat list now also live-refreshes via a `conversations` subscription in `ChatListClient`.
- **Navbar on chat** — `/chat` had no `TopNav` on desktop (custom header + `sm:hidden` BottomNav), stranding users. Added `TopNav` to the chat list page; chat detail keeps its back button (→ `/chat`, which now has full nav).
- **Loading speed** — `getListings`/`getAuctions` did N+1 seller lookups (one query per user); replaced with a single batched `getUserProfilesByIds` `.in()` query.

## Security review (secrets / data exposure)

Audited secrets handling, client/server boundaries, git history, and DB access controls.

**Clean:**
- `.env.local` is gitignored and was never committed; only `.env.example` (empty placeholders) is tracked. No secrets anywhere in git history.
- No hardcoded keys/JWTs in source. Service-role/admin client (`createAdminSupabaseClient`) is imported only by server code (route handlers, server components, server actions) — never by a `'use client'` component. All action files carry `'use server'`.
- Browser-exposed env is limited to `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key is designed to be public; protected by RLS) and `NEXT_PUBLIC_ADMIN_EMAIL(S)` (admin email used only to toggle the Admin menu — authorization is enforced server-side, not by this value).
- RLS enabled on all 9 public tables. `messages`/`conversations` SELECT restricted to participants; INSERT policies bind `auth.uid()` to sender/buyer/bidder (no spoofing). Image upload route requires auth, validates type/size, scopes to the user's own folder.

**Fixed during this review:**
- **CRITICAL — `/admin` had no access control.** It fetched all users' emails + every conversation via the service-role client (RLS-bypassing) and rendered them, with `getCurrentUser()` fetched but never checked. Any visitor could load the full admin dashboard. Added a server-side admin gate (`is_admin` flag or non-public `ADMIN_EMAILS`) that `redirect('/')`s before any data access.
- **HIGH — user emails were world-readable.** The `users` SELECT policy is public (intended for profiles) but the row included `email`, so anyone with the public anon key could scrape all emails via the REST API. Migration `0005_protect_user_email.sql` revokes table-level SELECT for anon/authenticated and re-grants SELECT on all columns *except* `email`. Owner's own email now comes from the auth session (`getCurrentUser`); admin uses the service role. All public user reads (queries, chat/bid embeds, realtime hooks) switched to an explicit non-email column set (`USER_PUBLIC_COLS`). Verified: `has_column_privilege(anon/authenticated,'email')` = false.

**Residual (low / pre-existing, not blocking):**
- Logged-in users can still read other users' emails is **no longer possible** (revoked for `authenticated` too). 
- `/api/translate` is an open authenticated-not-required proxy to DeepL — could burn quota if abused; consider rate-limiting/auth later (DeepL key is currently empty anyway).
- Supabase advisor WARNs: leaked-password protection disabled (enable in Auth settings), public-bucket listing on `avatars`/`listings`, mutable search_path on pre-existing functions. None expose secrets.

## Tech-debt cleanup (post-launch)

- **`listings.languages` fixed.** Column was `text` holding JSON-stringified arrays, so `.contains()` never matched. Migration `0006_languages_to_array.sql` converts it to `text[]` (existing data migrated) + GIN index. The language filter now actually works.
- **Types are now a single source of truth.** Regenerated `types/database.types.ts` from the live DB (includes all migration 0001–0006 columns/tables). Removed the manual column augmentations from `types/index.ts` — it now only adds *relational* fields (seller/store/owner/bidder/listingCount) and enum aliases (`SaleType`/`AuctionStatus` from generated `Enums`).
- **DRY.** Extracted `emailInAllowlist()` (`lib/adminEmails.ts`) used by both server pages and TopNav; moved `USER_PUBLIC_COLS` to `lib/userColumns.ts` (no server imports) so the realtime hooks reference it instead of duplicating the column list.
- **Perf.** `getStores` no longer does N+1 count queries — one `.in()` query tallied in memory.
- **ESLint configured** (`.eslintrc.json`, `next/core-web-vitals`). `npm run lint` runs clean (one non-blocking exhaustive-deps warning in TopNav).
- Still no automated tests (type-check via `next build` + lint are the gates).

## Flagged items / deferred

- **DB migrations not auto-applied** — Supabase MCP is connected to a different account than the app's project (`izwshmdscanpidkxrniu`). Run `supabase/migrations/0001–0003` in that project's SQL editor (in order). Features depending on new columns/tables stay inert until then.
- **NTS 사업자등록번호 lookup API** — deferred per spec; manual review only (format+checksum validation built).
- **Facet result counts** — existing filter UI shows no per-facet counts; new country filter matches that (no counts).
- **Vercel cron cadence** — `vercel.json` uses every-minute (`* * * * *`), requires Pro; switch to daily on Hobby (lazy close-on-read still covers UX).
- **New env var** — `CRON_SECRET` for `/api/cron/close-auctions`.
- **ESLint** — not configured (pre-existing).
- **`listings.languages` type mismatch (pre-existing bug, found during this build)** — the live DB column is `text` (single string), but the app inserts an array and filters with `.contains('languages', [...])`, and `types/database.types.ts` declares it `string[]`. Regenerating types from the live DB would type it `string | null` and break the build, so the generated types were **not** adopted wholesale; manual augmentations in `types/index.ts` remain the source for new columns. Fixing this properly means migrating the column to `text[]` (and backfilling) OR changing the code to treat languages as a single value — out of scope for these four phases; flagged for follow-up.

---

# Admin & Moderation Back-Office Build

Production admin/moderation layer. Branch per phase (`admin-N-*`); migrations `0008`+ applied to live project `izwshmdscanpidkxrniu` via Supabase MCP.

## Scope decisions (confirmed with operator)
- Build **all phases except Orders/Transactions/Disputes** — no payment/orders system exists, so there is nothing to administer (deferred).
- Build a **minimal reports system** (table + user "Report" controls) so the moderation queue has real data.
- RBAC seeded as **is_admin → super_admin**; `ADMIN_EMAILS` env retained as an emergency super-admin bootstrap.
- **Category/subcategory enum editing from the UI is deferred** — `listing_category` is a Postgres enum hardcoded across the app + i18n; governance is handled via the prohibited-keyword list (Phase 9). Adding/removing core categories stays a migration.

## Phase 0 — Discovery (admin)
- **Systems present** (full admin surfaces built): users, listings, auctions (`listings` auction cols + `bids`), stores + `store_requests`, chat (`conversations`/`messages`), `notifications`.
- **Absent**: reports (building minimal), orders/payments/disputes (deferred), audit log (built), feature-flags/config/banned-keywords (Phase 9), announcements (Phase 10).
- **Prior role model**: binary `users.is_admin` + `ADMIN_EMAILS` env + `is_admin()` SQL fn.

## Permission matrix (as implemented)
| Capability | super_admin | moderator | support |
|---|---|---|---|
| View dashboards / queues / audit log | ✓ | ✓ | ✓ (read-only) |
| Moderate listings / stores / auctions / messages, suspend users | ✓ | ✓ | ✗ |
| Assign roles, hard delete, platform config | ✓ | ✗ | ✗ |

Enforced by `assertRole(min)` (`lib/adminAuth.ts`, role rank support<moderator<super_admin) at the top of every admin action, plus the `app/admin/layout.tsx` segment gate and RLS role helpers (`has_admin_access`/`can_moderate`/`is_super_admin`).

## Phase 1 — Access, RBAC & Audit Log ✅
- **Migration `0008_admin_rbac_audit.sql`**: `admin_role` enum + `users.admin_role` column (bootstrapped from `is_admin`); SECURITY DEFINER helpers `current_admin_role`/`has_admin_access`/`can_moderate`/`is_super_admin`; `is_admin()` redefined to honor either source (existing RLS unaffected). `admin_audit_log` table with **SELECT-only** RLS (no INSERT/UPDATE/DELETE policies → append-only, immutable from any user client; only the service-role `logAdminAction()` writes).
- **Backend**: `lib/adminAuth.ts` (`getAdminContext` via the session client + env bootstrap, `assertRole`), `lib/auditLog.ts` (`logAdminAction`, captures actor + IP). `lib/adminActions.ts` refactored to `assertRole('moderator')` + audit logging on every mutation.
- **UI**: `app/admin/layout.tsx` segment-wide gate + role-aware sidebar (`components/admin/AdminNav.tsx`, `lib/adminNav.ts`); `app/admin/audit/page.tsx` + `components/admin/AuditLogTable.tsx` (filter by actor/action/target/date; read-only). `app/admin/page.tsx` slimmed (gate/TopNav moved to layout). i18n strings in en/ko/ru.
- **Verification**: `npm run build` + `npm run lint` pass. SQL RLS proof — non-admin: 0 audit rows + `has_admin_access=false`; super_admin: visible + `can_moderate=true`; support: `has_admin_access=true` but `can_moderate=false` & `is_super_admin=false`; audit log has only a SELECT policy.

## Phase 2 — Dashboard Home ✅
- **`lib/adminQueries.ts`**: `getAdminKpis()` (total users, signups 24h/7d, active listings, live auctions, pending stores, open reports, suspended+banned) and `getAdminTrends()` (30-day daily signup + listing buckets). Every count is defensive — a not-yet-existing table/column (reports, `account_status`) resolves to 0, so the dashboard compiles and renders before Phase 3/4 schema lands.
- **`components/admin/DashboardSummary.tsx`**: KPI cards, queue tiles with live badges, and inline-SVG sparklines (no new dependency). Tiles link only to routes that exist today (existing `?tab=` views + `/admin/audit`); the moderation-queue tile is added in Phase 4. Prepended to `app/admin/page.tsx` above the existing tabbed management UI (nothing removed yet — sub-pages absorb the tabs in later phases). i18n in en/ko/ru.
- **Verification**: `npm run build` passes; KPI numbers are real queries.

## Phase 3 — User Management ✅
- **Migration `0009_user_moderation.sql`**: `account_status` enum (active/suspended/banned) + `users.account_status`/`suspended_until`/`status_reason`. `is_user_active(uid)` helper (active, or suspension lapsed). **Capability loss enforced at the data layer** — the INSERT policies for `listings`, `bids`, `conversations`, `messages` now require `is_user_active(auth.uid())`, and `place_bid` returns `account_restricted`. `admin_force_logout(target)` SECURITY DEFINER RPC revokes auth sessions/refresh tokens (caller must pass `can_moderate()`).
- **Actions (`lib/adminActions.ts`)**: `adminSuspendUser` (until+reason), `adminBanUser` (reason), `adminReinstateUser`, `adminForceLogoutUser`, `adminSetUserRole` (**super_admin only**, keeps legacy `is_admin` in sync), `adminAddUserNote` (stored as an append-only `user.note` audit entry — no separate notes table). All reason-gated + audited; suspend/ban also notify the user and force-logout.
- **UI**: `/admin/users` (search + status/role filters, paginated) and `/admin/users/[id]` (profile, listings/bids/24h stats, rapid-listing fraud signal, internal notes, action buttons gated by viewer role). i18n en/ko/ru.
- **Verification**: `npm run build` + `npm run lint` pass. SQL proof — a banned user is rejected by RLS when inserting a listing; `is_user_active` returns false for a future-dated suspension and true once it lapses.

## Phase 4 — Reports + Content Moderation ✅
- **Migration `0010_reports.sql`**: `report_target`/`report_status`/`report_reason` enums + `reports` table (reporter, target, reason, details, status, assigned_to, resolution, timestamps + `set_updated_at` trigger). RLS — authenticated users file their own reports only while active; reporters read their own; `can_moderate()` reads/updates all.
- **User-facing reporting**: `lib/reportActions.ts` `createReport` (session client, 5-minute per-target rate limit). Reusable `components/ReportButton.tsx` (reason + details modal, multilingual) wired into the listing detail (non-sellers) and profile pages. Message/conversation reports land in Phase 8.
- **Admin moderation** (`/admin/moderation`, tabbed): **report queue** (`ReportQueueClient`) — filter by status/reason/target, claim → in_review, resolve (actioned/dismissed, required note → reporter notified), quick remove-listing; **listings review** (`ListingModerationClient`) — search, per-row recategorize, multi-select bulk remove (reason required). Actions: `adminAssignReport`, `adminResolveReport`, `adminSetListingCategory`, `adminBulkRemoveListings` — all role-gated + audited. Dashboard "Open reports" tile + nav entry now link here.
- **Deferred to Phase 9**: prohibited-keyword auto-flag (depends on the `banned_keywords` table built in Phase 9, which will add the insert/update trigger that auto-creates reports).
- **Verification**: `npm run build` + `npm run lint` pass. SQL proof — an active user can file a report and read their own via RLS.

## Phase 5 — Store Verification Queue ✅
- **Migrations**: `0011_store_status_suspended.sql` adds `suspended` to `store_status`; `0012_store_listing_visibility.sql` rewrites the public listings SELECT policy so a **suspended store's listings drop out of public view** (owner-scoped policy + service role still see them).
- **Actions (`lib/adminActions.ts`)**: existing approve/reject/doc-URL now role-gated + audited; new `adminRevokeStoreVerification`/`adminReverifyStore` (reversible badge) and `adminSuspendStore`/`adminUnsuspendStore` (reason-gated, owner notified, audited).
- **UI** (`/admin/stores`): pending-application queue (business name, 사업자등록번호, signed-URL document viewer, contact, applicant) → approve/reject(reason); existing-store management (verified/status badges, revoke/re-verify, suspend/unsuspend, link to public store). Dashboard tile + nav now point here.
- **Verification**: `npm run build` + `npm run lint` pass.

## Phase 6 — Auction Oversight ✅
- **Migration `0013_auction_admin.sql`**: SECURITY DEFINER RPCs (each checks `can_moderate()` against the caller's JWT, granted to `authenticated` only): `admin_cancel_auction`, `admin_void_bid` (recomputes `current_bid`/`current_winner_id` from remaining bids), `admin_extend_auction`, `admin_force_close` (reuses `finalize_auction`). All notify affected users.
- **Actions (`lib/adminActions.ts`)**: `adminCancelAuction`/`adminVoidBid`/`adminExtendAuction`/`adminForceCloseAuction` call the RPCs via the session client + audit each.
- **UI** (`/admin/auctions`): scheduled/live/ended/cancelled list with current bid, bidder count, ending time, expandable bid history (per-bid void), and cancel/extend/force-close actions. Heuristic flags any auction where one bidder placed ≥5 bids. Nav entry added.
- **Verification**: `npm run build` passes. SQL proof — voiding the top bid recomputed the high bid to the next-highest and reassigned the winner.

## Phase 8 — Messaging Moderation (report-driven) ✅
- **Migration `0014_messaging_moderation.sql`**: `messages.removed` (soft-removal) + `users.messaging_suspended` (narrower than a full ban); `can_message(uid)` helper (active AND not messaging-suspended); messages INSERT policy rewritten to use it.
- **User-facing**: conversation-level `ReportButton` added to the chat header; removed messages render as a localized placeholder for participants.
- **Admin** (`/admin/messages`): **report-driven only** (lists reports with target message/conversation — no blanket DM access). Actions: open thread (the existing read-only `/admin/chat/[id]`, now **gated via `getAdminContext` and logged on open**), remove message, warn user, suspend messaging, escalate→ban, resolve report. Actions: `adminWarnUser`/`adminSuspendMessaging`/`adminUnsuspendMessaging`/`adminRemoveMessage` — reason-gated + audited.
- **Verification**: `npm run build` passes. SQL proof — a messaging-suspended user returns `can_message=false` while remaining `is_user_active=true`.

## Phase 9 — Taxonomy & Platform Config (super_admin) ✅
- **Migration `0015_platform_config.sql`**: `banned_keywords`, `feature_flags` (seeded `maintenance_mode`), `platform_config` tables. RLS — admins read; **super_admin writes**; feature flags world-readable (app checks them on load). **Prohibited auto-flag** (the Phase 4 hook): `flag_prohibited_listing()` trigger on listing insert/update auto-creates an `open` report when title/description matches a banned keyword (dedup per listing); `admin_rescan_prohibited()` backfills existing active listings.
- **Backend**: `lib/featureFlags.ts` (`getFlag`/`isMaintenanceMode`); actions `adminAddBannedKeyword`/`adminDeleteBannedKeyword`/`adminSetFeatureFlag`/`adminUpsertConfig`/`adminRescanProhibited` (super_admin, audited). Root `app/layout.tsx` renders a localized maintenance screen for non-admins when `maintenance_mode` is on.
- **UI** (`/admin/settings`, super_admin-only — page-level role check): feature-flag toggles (incl. maintenance), banned-keyword management + rescan. Nav entry `min: 'super_admin'`.
- **Deferred**: category-*enum* editing (kept migration-managed — see top); country-list governance can live in `platform_config` as a follow-up.
- **Verification**: `npm run build` passes. SQL proof — adding the keyword "weapon" then creating a matching listing auto-created an `open` prohibited report.

## Phase 10 — Announcements ✅
- **Migration `0016_announcements.sql`**: `announcement_audience` enum + `announcements` table (multilingual `title`/`body` jsonb, audience, country_code, schedule window, published). RLS — public reads only currently-active published rows; `can_moderate()` reads all + writes.
- **Backend**: `adminSaveAnnouncement`/`adminToggleAnnouncement`/`adminDeleteAnnouncement` (moderator+, audited).
- **UI**: `/admin/announcements` (multilingual create/edit, audience + country + schedule + publish toggle); `components/AnnouncementBanner.tsx` (server) mounted in the root layout renders active announcements in the viewer's locale, filtered by audience (all/buyers everyone; sellers → has a listing; stores → owns a store; country → matches profile location). Nav entry added.
- **Verification**: `npm run build` + `npm run lint` pass. SQL proof — anon sees only the published announcement, not the draft.

## Permission matrix verification summary
All destructive admin actions call `assertRole(min)` server-side and write to `admin_audit_log`; the log has only a SELECT policy (append-only). RLS simulations proved: support is read-only (can_moderate=false), suspended/banned users lose list/bid/message at the data layer, suspended-store and draft-announcement rows are hidden from the public, and the prohibited-keyword trigger auto-files reports.
- **DB migrations APPLIED** — 0001–0003 applied to project `izwshmdscanpidkxrniu` via Supabase MCP (after reconnecting the correct account) and verified; advisor shows only WARN-level lints (security-definer RPCs are intentional + internally guarded).
