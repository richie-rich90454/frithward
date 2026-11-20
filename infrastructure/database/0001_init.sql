-- Better Auth core tables. Reserved identifiers are quoted.
create table if not exists "user" (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null unique,
  email_verified boolean not null default false,
  image text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references "user"(id) on delete cascade,
  expires_at timestamp with time zone not null,
  token text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  ip_address text,
  user_agent text
);

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

create table if not exists scam_analyses (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  summary text not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists job_status (
  job_id text primary key,
  status text not null,
  result jsonb,
  error text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
