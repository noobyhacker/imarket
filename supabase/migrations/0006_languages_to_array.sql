-- Fix listings.languages: it was a `text` column holding JSON-stringified arrays
-- (e.g. '["English","Korean"]'), so the array containment filter (.contains())
-- silently never matched. Convert the column to text[] and migrate existing data.

-- Helper (subqueries aren't allowed directly in an ALTER ... USING transform).
create or replace function public._lang_to_array(v text) returns text[]
language sql immutable as $$
  select case
    when v is null then null
    when v ~ '^\s*\[' then array(select jsonb_array_elements_text(v::jsonb))
    when v = '' then null
    else array[v]
  end
$$;

alter table public.listings alter column languages drop default;

alter table public.listings
  alter column languages type text[] using public._lang_to_array(languages);

drop function public._lang_to_array(text);

create index if not exists listings_languages_idx on public.listings using gin (languages);
