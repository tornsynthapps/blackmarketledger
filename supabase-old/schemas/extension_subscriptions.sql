create table public.extension_subscriptions (
  id bigserial not null,
  torn_user_id bigint not null,
  username text null,
  valid_until timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  torn_api_key text null,
  constraint extension_subscriptions_pkey primary key (id, torn_user_id),
  constraint extension_subscriptions_torn_user_id_key unique (torn_user_id)
) TABLESPACE pg_default;

create index IF not exists extension_subscriptions_valid_until_idx on public.extension_subscriptions using btree (valid_until) TABLESPACE pg_default;

create unique INDEX IF not exists extension_subscriptions_torn_api_key_idx on public.extension_subscriptions using btree (torn_api_key) TABLESPACE pg_default;

create trigger extension_subscriptions_touch_updated_at BEFORE
update on extension_subscriptions for EACH row
execute FUNCTION touch_updated_at ();