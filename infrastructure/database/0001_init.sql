create table if not exists user (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamp with time zone not null default now()
);

create table if not exists session (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now()
);

create table if not exists scam_analyses (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  summary text not null,
  created_at timestamp with time zone not null default now()
);
