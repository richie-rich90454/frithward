-- Phase 3 persistence: case records and the two report stores.
create table if not exists community_reports (
  id uuid primary key,
  title text not null,
  body text not null,
  findings jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists incident_reports (
  id uuid primary key,
  title text not null,
  severity text not null,
  details text not null,
  status text not null default 'open',
  created_at timestamp with time zone not null default now()
);

create table if not exists cases (
  id uuid primary key,
  kind text not null,
  title text not null,
  inputs jsonb not null default '{}'::jsonb,
  findings jsonb not null default '[]'::jsonb,
  artifacts jsonb not null default '[]'::jsonb,
  next_steps jsonb not null default '[]'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  status text not null default 'draft',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
