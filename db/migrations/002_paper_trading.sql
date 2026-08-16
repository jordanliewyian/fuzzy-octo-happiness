create table if not exists paper_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references users(id) on delete cascade,
  starting_cash numeric(20,8) not null default 100000,
  cash numeric(20,8) not null default 100000,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists paper_market_quotes (
  symbol text primary key,
  base_price numeric(20,8) not null check (base_price > 0),
  price numeric(20,8) not null check (price > 0),
  previous_price numeric(20,8) not null check (previous_price > 0),
  updated_at timestamptz not null default now()
);

create table if not exists paper_fills (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  symbol text not null,
  side text not null check (side in ('buy', 'sell')),
  qty numeric(20,8) not null check (qty > 0),
  price numeric(20,8) not null check (price > 0),
  created_at timestamptz not null default now()
);

create index if not exists paper_fills_order_idx on paper_fills(order_id, created_at);
create index if not exists paper_fills_user_idx on paper_fills(user_id, created_at desc);

alter table orders add column if not exists execution_mode text not null default 'paper';
alter table orders add column if not exists order_type text not null default 'market';
alter table orders add column if not exists time_in_force text not null default 'day';
alter table orders add column if not exists limit_price numeric(20,8);
alter table orders add column if not exists stop_price numeric(20,8);
alter table orders add column if not exists filled_qty numeric(20,8) not null default 0;
alter table orders add column if not exists remaining_qty numeric(20,8);
alter table orders add column if not exists avg_fill_price numeric(20,8);
alter table orders add column if not exists submitted_at timestamptz not null default now();
alter table orders add column if not exists updated_at timestamptz not null default now();
alter table orders add column if not exists triggered_at timestamptz;
alter table orders add column if not exists rejection_reason text;
alter table orders add column if not exists cancel_reason text;
alter table orders add column if not exists client_order_id text;

create unique index if not exists orders_user_client_order_idx
  on orders(user_id, client_order_id)
  where client_order_id is not null;

insert into paper_market_quotes(symbol, base_price, price, previous_price) values
  ('AAPL', 203.15, 203.15, 203.15),
  ('MSFT', 527.20, 527.20, 527.20),
  ('NVDA', 181.40, 181.40, 181.40),
  ('AMZN', 231.85, 231.85, 231.85),
  ('GOOGL', 244.30, 244.30, 244.30),
  ('META', 785.10, 785.10, 785.10),
  ('TSLA', 340.55, 340.55, 340.55),
  ('SPY', 645.20, 645.20, 645.20),
  ('QQQ', 574.10, 574.10, 574.10),
  ('BRK.B', 470.80, 470.80, 470.80)
on conflict (symbol) do nothing;
