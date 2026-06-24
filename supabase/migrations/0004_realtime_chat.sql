-- Enable realtime for chat. messages + conversations were never added to the
-- supabase_realtime publication, so live chat updates never fired.
-- Re-runnable / idempotent.

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.conversations;
exception when duplicate_object then null; end $$;
