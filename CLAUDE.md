# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start Next.js dev server
npm run build    # production build
npm run lint     # ESLint
```

No test suite is configured.

## Architecture

iMarket is a **Next.js 14 App Router** marketplace app targeting foreigners in Korea. It uses Supabase for auth, database, and storage, with DeepL for automatic translation.

### Supabase clients — two distinct patterns

- `lib/supabaseClient.ts` — browser client (`createBrowserClient`), used in Client Components and hooks. Marked `'use client'`.
- `lib/supabaseServer.ts` — exports `createServerSupabaseClient()` (anon key) and `createAdminSupabaseClient()` (service role key). Used in Server Components, Route Handlers, and Server Actions. Never import from client components.

### Data fetching

All server-side queries live in `lib/queries.ts` and are called from page Server Components. Pages pass data down as props to Client Components — there is no SWR/React Query layer. Realtime updates for chat messages use `hooks/useRealtimeMessages.ts` (Supabase Realtime channel subscription).

### Translation

Listings store both `title_original` / `description_original` (seller's language) and `title_translated` / (translated). DeepL is called server-side via `lib/translation.ts` (never import from client components) which has an in-process LRU cache. The `/api/translate` route exposes translation to Client Components.

### i18n (next-intl)

Locale is resolved from the `NEXT_LOCALE` cookie, then `Accept-Language` header, defaulting to `ko`. Message files are in `i18n/messages/en.json` and `ko.json`. Use `getTranslations()` in Server Components and `useTranslations()` in Client Components.

### Admin

`lib/adminActions.ts` contains Server Actions gated behind `assertAdmin()`, which checks the caller's email against `ADMIN_EMAIL` / `ADMIN_EMAILS` env vars (comma-separated). The admin client uses the service role key to bypass RLS.

### Image uploads

Images upload to Supabase Storage bucket `listings` via `/api/images/upload`. Helper functions `getSupabaseImageUrl()` and `getAvatarUrl()` in `lib/utils.ts` construct public URLs. `next.config.js` whitelists `*.supabase.co` and `api.dicebear.com` for `next/image`.

### Required env vars

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DEEPL_API_KEY
ADMIN_EMAIL          # or ADMIN_EMAILS (comma-separated)
```
