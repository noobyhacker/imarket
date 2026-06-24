import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabaseServer';

// Backstop that finalizes auctions whose end time has passed and emits
// winner/seller notifications. Lazy close-on-read handles live UX; this
// covers auctions nobody has opened. Scheduled via vercel.json `crons`.

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const auth = request.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createAdminSupabaseClient();
    const { data, error } = await supabase.rpc('close_due_auctions');
    if (error) throw error;
    return NextResponse.json({ ok: true, closed: data ?? 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
