-- Agent system tables
-- Run in Supabase SQL editor

-- 1. Agent run logs
create table if not exists agent_logs (
  id           uuid primary key default gen_random_uuid(),
  agent_name   text not null,
  task         text not null,
  payload      jsonb,
  result       jsonb,
  status       text not null check (status in ('success','error','retried')),
  duration_ms  integer,
  created_at   timestamptz not null default now()
);
create index if not exists agent_logs_agent_name_idx on agent_logs(agent_name);
create index if not exists agent_logs_created_at_idx  on agent_logs(created_at desc);

-- 2. Product moderation queue
create table if not exists product_queue (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete cascade,
  status        text not null default 'pending' check (status in ('pending','approved','rejected')),
  quality_score numeric(4,3),
  issues        jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists product_queue_status_idx on product_queue(status);

-- 3. Review moderation queue
create table if not exists review_queue (
  id         uuid primary key default gen_random_uuid(),
  review_id  uuid,
  status     text not null default 'pending' check (status in ('pending','approved','rejected')),
  risk_score numeric(4,3),
  reason     text,
  created_at timestamptz not null default now()
);
create index if not exists review_queue_status_idx on review_queue(status);

-- 4. Affiliate links
create table if not exists affiliate_links (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references products(id) on delete cascade,
  platform        text not null,
  url             text not null,
  commission_rate numeric(5,4) default 0,
  valid           boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (product_id, platform)
);
create index if not exists affiliate_links_product_id_idx on affiliate_links(product_id);
create index if not exists affiliate_links_valid_idx       on affiliate_links(valid);
