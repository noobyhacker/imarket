'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import type { Bid } from '@/types';

export function useRealtimeBids(listingId: string, initialBids: Bid[]) {
  const [bids, setBids] = useState<Bid[]>(initialBids);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`auctions:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `listing_id=eq.${listingId}`,
        },
        async (payload) => {
          const newBid = payload.new as Bid;
          const { data: bidder } = await supabase
            .from('users')
            .select('id, nickname, avatar_url, trust_score, review_count, badge, languages, location, created_at, is_admin, language')
            .eq('id', newBid.bidder_id)
            .single();

          setBids((prev) => {
            if (prev.find((b) => b.id === newBid.id)) return prev;
            return [{ ...newBid, bidder: (bidder ?? undefined) as Bid['bidder'] }, ...prev];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [listingId]);

  return { bids, setBids };
}
