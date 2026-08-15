create extension if not exists pgcrypto;
create table if not exists users(id uuid primary key default gen_random_uuid(),email text unique not null,password_hash text not null,created_at timestamptz not null default now());
create table if not exists sessions(token text primary key,user_id uuid not null references users(id) on delete cascade,expires_at timestamptz not null);
create index if not exists sessions_user_idx on sessions(user_id);
create table if not exists orders(id uuid primary key default gen_random_uuid(),user_id uuid not null references users(id) on delete cascade,broker_order_id text not null,symbol text not null,side text not null,qty numeric not null,status text not null,created_at timestamptz not null default now());
create index if not exists orders_user_created_idx on orders(user_id,created_at desc);
