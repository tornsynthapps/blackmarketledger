create table public.google_sync_configs (
  torn_user_id bigint not null,
  google_api_key text not null,
  access_token text null,
  refresh_token text null,
  token_type text null,
  scopes text[] not null default '{}'::text[],
  expires_at timestamp with time zone null,
  connected_at timestamp with time zone null,
  updated_at timestamp with time zone not null default now(),
  last_synced_at timestamp with time zone null,
  drive_file_id text null,
  torn_api_key text null,
  constraint google_sync_configs_pkey1 primary key (torn_user_id)
) TABLESPACE pg_default;

create index IF not exists google_sync_configs_connected_idx on public.google_sync_configs using btree (connected_at desc) TABLESPACE pg_default;

create unique INDEX IF not exists google_sync_configs_torn_api_key_idx on public.google_sync_configs using btree (torn_api_key) TABLESPACE pg_default;

create trigger google_sync_configs_touch_updated_at BEFORE
update on google_sync_configs for EACH row
execute FUNCTION touch_updated_at ();
