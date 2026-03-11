-- BML Connect subscription schema
create table if not exists public.extension_subscriptions (
  id bigserial primary key,
  torn_user_id bigint not null unique,
  username text,
  valid_until timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists extension_subscriptions_valid_until_idx
  on public.extension_subscriptions (valid_until);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists extension_subscriptions_touch_updated_at on public.extension_subscriptions;
create trigger extension_subscriptions_touch_updated_at
before update on public.extension_subscriptions
for each row execute function public.touch_updated_at();

-- Row level security is optional for server-side service-role access.
alter table public.extension_subscriptions enable row level security;

create policy "service role full access"
on public.extension_subscriptions
as permissive
for all
to service_role
using (true)
with check (true);
