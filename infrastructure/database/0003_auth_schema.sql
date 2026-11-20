-- Idempotent upgrade from the partial auth schema. Every statement is safe to
-- rerun after 0001 has already created the complete schema.
alter table "user" add column if not exists name text not null default '';
alter table "user" add column if not exists email_verified boolean not null default false;
alter table "user" add column if not exists image text;
alter table "user" add column if not exists updated_at timestamp with time zone not null default now();

alter table session add column if not exists token text not null default gen_random_uuid()::text;
alter table session add column if not exists updated_at timestamp with time zone not null default now();
alter table session add column if not exists ip_address text;
alter table session add column if not exists user_agent text;

create unique index if not exists session_token_unique on session(token);
create index if not exists session_user_id_idx on session(user_id);

create table if not exists account (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references "user"(id) on delete cascade,
  account_id text not null,
  provider_id text not null,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamp with time zone,
  refresh_token_expires_at timestamp with time zone,
  scope text,
  password text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists account_user_id_idx on account(user_id);

create table if not exists verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists verification_identifier_idx on verification(identifier);
