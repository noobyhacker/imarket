'use server';

import { revalidatePath } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabaseServer';
import { getCurrentUser } from '@/lib/queries';
import { isValidBusinessNumber, normalizeBusinessNumber } from '@/lib/businessNumber';

export async function submitStoreApplication(input: {
  business_name: string;
  business_reg_number: string;
  category: string;
  contact: string;
  document_url: string; // storage path in store-docs bucket
  description?: string;
}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('You must be signed in to apply');

  const reg = normalizeBusinessNumber(input.business_reg_number);
  if (!isValidBusinessNumber(reg)) {
    throw new Error('Invalid 사업자등록번호 (business registration number)');
  }
  if (!input.business_name.trim() || !input.category.trim() || !input.contact.trim()) {
    throw new Error('Please fill in all required fields');
  }
  if (!input.document_url) {
    throw new Error('Business registration certificate is required');
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from('store_requests').insert({
    user_id: user.id,
    name: input.business_name.trim(),
    business_name: input.business_name.trim(),
    business_reg_number: reg,
    category: input.category.trim(),
    contact: input.contact.trim(),
    description: input.description?.trim() ?? '',
    document_url: input.document_url,
    status: 'pending',
  });
  if (error) throw error;

  revalidatePath('/stores/apply');
  revalidatePath('/admin');
}
