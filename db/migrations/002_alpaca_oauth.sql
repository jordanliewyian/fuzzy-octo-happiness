create table if not exists alpaca_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  account_id text not null,
  environment text not null check (environment in ('paper', 'live')),
  access_token_encrypted text not null,
  scope text not null default '',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists alpaca_connections_user_idx on alpaca_connections(user_id);

create table if not exists alpaca_oauth_states (
  state text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists alpaca_oauth_states_expires_idx on alpaca_oauth_states(expires_at);
