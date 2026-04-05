create table public.google_auth_states (
  id uuid not null default gen_random_uuid (),
  torn_user_id bigint not null,
  google_api_key text not null,
  redirect_uri text not null,
  created_at timestamp with time zone not null default now(),
  torn_api_key text null,
  constraint google_auth_states_pkey1 primary key (id)
) TABLESPACE pg_default;

create index IF not exists google_auth_states_user_created_idx on public.google_auth_states using btree (torn_user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists google_auth_states_api_key_created_idx on public.google_auth_states using btree (torn_api_key, created_at desc) TABLESPACE pg_default;