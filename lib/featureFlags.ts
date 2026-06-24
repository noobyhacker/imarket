import { createServerSupabaseClient } from '@/lib/supabaseServer';

/** Read a feature flag (world-readable table). Defaults to false on any error. */
export async function getFlag(key: string): Promise<boolean> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.from('feature_flags').select('enabled').eq('key', key).maybeSingle();
    return !!data?.enabled;
  } catch {
    return false;
  }
}

export function isMaintenanceMode(): Promise<boolean> {
  return getFlag('maintenance_mode');
}
