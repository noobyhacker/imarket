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

## Phase 4 — Store owners

_Pending._

## Flagged items / deferred

- **NTS 사업자등록번호 lookup API** — deferred per spec; manual review only (format+checksum validation built).
- **Facet result counts** — existing filter UI shows no per-facet counts; new country filter matches that (no counts).
- **Russian i18n** — added as full locale in the i18n phase.
