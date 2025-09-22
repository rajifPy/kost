-- Supabase schema for rooms and payments

create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  number text not null,
  title text,
  description text,
  price integer,
  is_available boolean default true,
  images text[],
  created_at timestamptz default now()
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  tenant_name text,
  phone text,
  room_id uuid references rooms(id) on delete set null,
  month text,
  message text,
  receipt_url text,
  status text default 'pending',
  created_at timestamptz default now()
);
