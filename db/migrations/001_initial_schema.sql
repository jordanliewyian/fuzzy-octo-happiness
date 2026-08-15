create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  broker_order_id text not null,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  qty numeric(20,8) not null check (qty > 0),
  status text not null,
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  filled_price numeric(20,8)
);

create unique index if not exists orders_broker_order_id_uq on orders(broker_order_id);
create index if not exists orders_user_created_idx on orders(user_id, created_at desc);
create index if not exists orders_symbol_idx on orders(symbol);

create table if not exists positions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  quantity numeric(20,8) not null default 0,
  average_cost numeric(20,8) not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists watchlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  created_at timestamptz not null default now(),
  unique (user_id, symbol)
);

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);
