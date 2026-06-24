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
- **DB migrations APPLIED** — 0001–0003 applied to project `izwshmdscanpidkxrniu` via Supabase MCP (after reconnecting the correct account) and verified; advisor shows only WARN-level lints (security-definer RPCs are intentional + internally guarded).
