-- Our Savings: shared household migration for Supabase
-- Run in SQL Editor as project owner.
-- Adds a shared savings space for two authenticated accounts.
-- Existing tables are retained. Existing rows remain owner-only until explicitly migrated.

begin;

create table if not exists public.savings_households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Tabungan Bersama'
    check (char_length(trim(name)) between 1 and 100),
  invite_code text not null unique
    default upper(encode(gen_random_bytes(8), 'hex')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_household_members (
  household_id uuid not null references public.savings_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- This implementation allows each account to belong to only one shared household.
  unique (user_id)
);

alter table public.savings_goals
  add column if not exists household_id uuid
  references public.savings_households(id) on delete cascade;

create index if not exists savings_goals_household_idx
  on public.savings_goals(household_id);

create index if not exists savings_members_user_idx
  on public.savings_household_members(user_id);

alter table public.savings_households enable row level security;
alter table public.savings_household_members enable row level security;
alter table public.savings_goals enable row level security;
alter table public.savings_transactions enable row level security;

-- Remove the prior single-user goal policies, if present.
drop policy if exists "Read own goals" on public.savings_goals;
drop policy if exists "Create own goals" on public.savings_goals;
drop policy if exists "Update own goals" on public.savings_goals;
drop policy if exists "Delete own goals" on public.savings_goals;

-- Remove prior transaction policy, if present.
drop policy if exists "Read own transactions" on public.savings_transactions;

-- Household and membership data can only be read by a current member.
drop policy if exists "Members read their households" on public.savings_households;
create policy "Members read their households"
on public.savings_households
for select to authenticated
using (
  exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_households.id
      and m.user_id = (select auth.uid())
  )
);

drop policy if exists "Members read household membership" on public.savings_household_members;
create policy "Users read their own membership"
on public.savings_household_members
for select to authenticated
using (user_id = (select auth.uid()));

-- Goals belonging to a household are accessible to household members.
-- Legacy goals without household_id remain accessible only to their original owner.
create policy "Read accessible goals"
on public.savings_goals
for select to authenticated
using (
  (household_id is not null and exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_goals.household_id
      and m.user_id = (select auth.uid())
  ))
  or
  (household_id is null and user_id = (select auth.uid()))
);

create policy "Create goals in household"
on public.savings_goals
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and household_id is not null
  and exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_goals.household_id
      and m.user_id = (select auth.uid())
  )
);

create policy "Update accessible goals"
on public.savings_goals
for update to authenticated
using (
  household_id is not null and exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_goals.household_id
      and m.user_id = (select auth.uid())
  )
)
with check (
  household_id is not null
  and exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_goals.household_id
      and m.user_id = (select auth.uid())
  )
);

create policy "Delete accessible goals"
on public.savings_goals
for delete to authenticated
using (
  household_id is not null and exists (
    select 1 from public.savings_household_members m
    where m.household_id = savings_goals.household_id
      and m.user_id = (select auth.uid())
  )
);

-- Transaction visibility follows the household attached to its goal.
-- Legacy transactions remain visible only to the actor/owner.
create policy "Read accessible transactions"
on public.savings_transactions
for select to authenticated
using (
  exists (
    select 1 from public.savings_goals g
    join public.savings_household_members m
      on m.household_id = g.household_id
    where g.id = savings_transactions.goal_id
      and m.user_id = (select auth.uid())
  )
  or
  (
    savings_transactions.user_id = (select auth.uid())
    and exists (
      select 1 from public.savings_goals g
      where g.id = savings_transactions.goal_id
        and g.household_id is null
    )
  )
);

-- Do not permit browser clients to insert/update/delete transactions directly.
revoke insert, update, delete on public.savings_transactions from anon, authenticated;
grant select on public.savings_transactions to authenticated;
grant select, insert, update, delete on public.savings_goals to authenticated;
grant select on public.savings_households to authenticated;
grant select on public.savings_household_members to authenticated;

-- Create a shared household for the logged-in user.
create or replace function public.create_savings_household(p_name text default 'Tabungan Bersama')
returns table (household_id uuid, invite_code text, household_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household public.savings_households;
begin
  if v_user is null then
    raise exception 'Silakan login terlebih dahulu';
  end if;

  if exists (
    select 1 from public.savings_household_members m where m.user_id = v_user
  ) then
    raise exception 'Akun ini sudah tergabung dalam ruang tabungan';
  end if;

  if p_name is null or char_length(trim(p_name)) not between 1 and 100 then
    raise exception 'Nama tabungan harus 1 sampai 100 karakter';
  end if;

  insert into public.savings_households(name, created_by)
  values (trim(p_name), v_user)
  returning * into v_household;

  insert into public.savings_household_members(household_id, user_id, role)
  values (v_household.id, v_user, 'owner');

  return query select v_household.id, v_household.invite_code, v_household.name;
end;
$$;

-- Join using the invite code. The code is not readable from the households table
-- unless the caller is already a member.
create or replace function public.join_savings_household(p_invite_code text)
returns table (household_id uuid, household_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_household public.savings_households;
  v_count integer;
begin
  if v_user is null then
    raise exception 'Silakan login terlebih dahulu';
  end if;

  if exists (
    select 1 from public.savings_household_members m where m.user_id = v_user
  ) then
    raise exception 'Akun ini sudah tergabung dalam ruang tabungan';
  end if;

  if p_invite_code is null or char_length(trim(p_invite_code)) < 8 then
    raise exception 'Kode undangan tidak valid';
  end if;

  select h.* into v_household
  from public.savings_households h
  where h.invite_code = upper(trim(p_invite_code))
  for update;

  if not found then
    raise exception 'Kode undangan tidak ditemukan';
  end if;

  select count(*) into v_count
  from public.savings_household_members m
  where m.household_id = v_household.id;

  if v_count >= 2 then
    raise exception 'Ruang tabungan ini sudah memiliki dua anggota';
  end if;

  insert into public.savings_household_members(household_id, user_id, role)
  values (v_household.id, v_user, 'member');

  return query select v_household.id, v_household.name;
end;
$$;

-- Safe transaction RPC. Supports deposit/withdrawal and records the acting user.
create or replace function public.record_savings_transaction(
  p_goal_id uuid,
  p_type text,
  p_amount numeric,
  p_note text default null
)
returns public.savings_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_household_id uuid;
  v_balance numeric(14,2);
  v_transaction public.savings_transactions;
begin
  if v_user_id is null then
    raise exception 'Silakan login terlebih dahulu';
  end if;

  if p_type is null or p_type not in ('deposit', 'withdrawal') then
    raise exception 'Jenis transaksi tidak valid';
  end if;

  if p_amount is null or p_amount <= 0
     or p_amount > 999999999999.99
     or p_amount <> round(p_amount, 2) then
    raise exception 'Nominal transaksi tidak valid';
  end if;

  if p_note is not null and char_length(p_note) > 500 then
    raise exception 'Catatan terlalu panjang';
  end if;

  select g.household_id into v_household_id
  from public.savings_goals g
  where g.id = p_goal_id
    and g.household_id is not null
    and exists (
      select 1 from public.savings_household_members m
      where m.household_id = g.household_id
        and m.user_id = v_user_id
    )
  for update;

  if not found then
    raise exception 'Target tidak ditemukan atau akses ditolak';
  end if;

  select coalesce(sum(
    case when t.type = 'deposit' then t.amount else -t.amount end
  ), 0)
  into v_balance
  from public.savings_transactions t
  where t.goal_id = p_goal_id;

  if p_type = 'withdrawal' and p_amount > v_balance then
    raise exception 'Saldo tidak mencukupi';
  end if;

  insert into public.savings_transactions(user_id, goal_id, type, amount, note)
  values (v_user_id, p_goal_id, p_type, p_amount, p_note)
  returning * into v_transaction;

  return v_transaction;
end;
$$;

revoke all on function public.create_savings_household(text) from public, anon;
revoke all on function public.join_savings_household(text) from public, anon;
revoke all on function public.record_savings_transaction(uuid, text, numeric, text) from public, anon;

grant execute on function public.create_savings_household(text) to authenticated;
grant execute on function public.join_savings_household(text) to authenticated;
grant execute on function public.record_savings_transaction(uuid, text, numeric, text) to authenticated;

commit;
