'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { USER_PUBLIC_COLS } from '@/lib/userColumns';
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
            .select(USER_PUBLIC_COLS)
            .eq('id', newBid.bidder_id)
            .single();

          setBids((prev) => {
            if (prev.find((b) => b.id === newBid.id)) return prev;
            // Drop the optimistic placeholder this INSERT corresponds to so the
            // bid isn't shown twice.
            const withoutOptimistic = prev.filter(
              (b) =>
                !(
                  b.id.startsWith('temp-') &&
                  b.bidder_id === newBid.bidder_id &&
                  b.amount === newBid.amount
                )
            );
            return [{ ...newBid, bidder: (bidder ?? undefined) as Bid['bidder'] }, ...withoutOptimistic];
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
