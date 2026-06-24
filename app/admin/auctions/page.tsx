import { getTranslations } from 'next-intl/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';
import { getAdminContext } from '@/lib/adminAuth';
import AuctionOversightClient, { type AuctionRow } from '@/components/admin/AuctionOversightClient';

// Access enforced by app/admin/layout.tsx.
export default async function AdminAuctionsPage() {
  const t = await getTranslations('admin.auctions');
  const ctx = await getAdminContext();
  const canModerate = ctx?.role === 'moderator' || ctx?.role === 'super_admin';
  const supabase = await createAdminSupabaseClient();

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title_original, auction_status, current_bid, auction_end')
    .eq('sale_type', 'auction')
    .order('auction_end', { ascending: true, nullsFirst: false });

  const auctions = listings ?? [];
  const ids = auctions.map((a) => a.id);

  const { data: bids } = ids.length
    ? await supabase.from('bids').select('id, listing_id, bidder_id, amount, created_at').in('listing_id', ids).order('amount', { ascending: false })
    : { data: [] };

  const bidderIds = [...new Set((bids ?? []).map((b: { bidder_id: string }) => b.bidder_id))];
  const { data: bidders } = bidderIds.length
    ? await supabase.from('users').select('id, nickname').in('id', bidderIds)
    : { data: [] };
  const nameById = new Map((bidders ?? []).map((u: { id: string; nickname: string }) => [u.id, u.nickname]));

  const byListing = new Map<string, { id: string; bidder_id: string; amount: number; created_at: string }[]>();
  for (const b of (bids ?? []) as { id: string; listing_id: string; bidder_id: string; amount: number; created_at: string }[]) {
    if (!byListing.has(b.listing_id)) byListing.set(b.listing_id, []);
    byListing.get(b.listing_id)!.push(b);
  }

  const rows: AuctionRow[] = auctions.map((a) => {
    const list = byListing.get(a.id) ?? [];
    const perBidder = new Map<string, number>();
    for (const b of list) perBidder.set(b.bidder_id, (perBidder.get(b.bidder_id) ?? 0) + 1);
    const suspicious = [...perBidder.values()].some((n) => n >= 5);
    return {
      id: a.id,
      title: a.title_original,
      status: a.auction_status ?? 'scheduled',
      currentBid: a.current_bid,
      auctionEnd: a.auction_end,
      bidderCount: perBidder.size,
      suspicious,
      bids: list.map((b) => ({ id: b.id, bidderName: nameById.get(b.bidder_id) ?? b.bidder_id.slice(0, 8), amount: b.amount, created_at: b.created_at })),
    };
  });

  return (
    <div>
      <h1 className="mb-4 text-lg font-bold text-foreground">{t('title')}</h1>
      <AuctionOversightClient rows={rows} canModerate={canModerate} />
    </div>
  );
}
