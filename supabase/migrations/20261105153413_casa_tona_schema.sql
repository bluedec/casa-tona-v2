-- Casa Tona: events, inventory, event cash boxes and general cash flow.

-- RLS policies only filter rows; the underlying table privileges must be
-- granted separately or every query gets "permission denied" regardless of policy.
grant usage on schema public to authenticated;

-- ============================================================
-- profiles (role-based access: admin / cajero)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role text not null default 'cajero' check (role in ('admin', 'cajero')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- SECURITY DEFINER so policies that call this don't recurse into profiles' own RLS.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'cajero')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_name"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_manage"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ============================================================
-- inventory_items (bebidas, botellas, comida, otro)
-- ============================================================
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('bebida', 'botella', 'comida', 'otro')),
  unit text not null default 'unidad',
  price numeric(10, 2) not null default 0 check (price >= 0),
  stock_quantity numeric(10, 2) not null default 0 check (stock_quantity >= 0),
  low_stock_threshold numeric(10, 2) not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.inventory_items enable row level security;

create policy "inventory_select_authenticated"
  on public.inventory_items for select
  to authenticated
  using (true);

create policy "inventory_admin_write"
  on public.inventory_items for insert
  to authenticated
  with check (public.is_admin());

create policy "inventory_admin_update"
  on public.inventory_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "inventory_admin_delete"
  on public.inventory_items for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- events
-- ============================================================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  client_name text not null,
  client_phone text,
  event_date date not null,
  start_time time,
  end_time time,
  expected_guests integer,
  total_price numeric(10, 2),
  deposit_amount numeric(10, 2),
  status text not null default 'reservado'
    check (status in ('reservado', 'confirmado', 'en_curso', 'finalizado', 'cancelado')),
  notes text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only one non-cancelled event may occupy a given date.
create unique index events_date_unique_when_active
  on public.events (event_date)
  where (status <> 'cancelado');

alter table public.events enable row level security;

create policy "events_select_authenticated"
  on public.events for select
  to authenticated
  using (true);

create policy "events_admin_write"
  on public.events for insert
  to authenticated
  with check (public.is_admin());

create policy "events_admin_update"
  on public.events for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "events_admin_delete"
  on public.events for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- event_cash_boxes (one daily cash box per event)
-- ============================================================
create table public.event_cash_boxes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null unique references public.events (id) on delete cascade,
  status text not null default 'abierta' check (status in ('abierta', 'cerrada')),
  opening_amount numeric(10, 2) not null default 0,
  opened_at timestamptz not null default now(),
  opened_by uuid references public.profiles (id),
  closed_at timestamptz,
  closed_by uuid references public.profiles (id),
  notes text
);

alter table public.event_cash_boxes enable row level security;

create policy "cash_boxes_select_authenticated"
  on public.event_cash_boxes for select
  to authenticated
  using (true);

create policy "cash_boxes_staff_insert"
  on public.event_cash_boxes for insert
  to authenticated
  with check (true);

create policy "cash_boxes_staff_update_open_only"
  on public.event_cash_boxes for update
  to authenticated
  using (public.is_admin() or status = 'abierta')
  with check (public.is_admin() or status = 'abierta');

create policy "cash_boxes_admin_delete"
  on public.event_cash_boxes for delete
  to authenticated
  using (public.is_admin());

-- ============================================================
-- event_cash_movements (manual ingreso/egreso, or a linked inventory sale)
-- ============================================================
create table public.event_cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_box_id uuid not null references public.event_cash_boxes (id) on delete cascade,
  type text not null check (type in ('ingreso', 'egreso')),
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  inventory_item_id uuid references public.inventory_items (id),
  quantity numeric(10, 2),
  unit_price numeric(10, 2),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.event_cash_movements enable row level security;

create policy "cash_movements_select_authenticated"
  on public.event_cash_movements for select
  to authenticated
  using (true);

create policy "cash_movements_staff_insert_when_open"
  on public.event_cash_movements for insert
  to authenticated
  with check (
    exists (
      select 1 from public.event_cash_boxes b
      where b.id = cash_box_id and b.status = 'abierta'
    )
  );

create policy "cash_movements_admin_delete"
  on public.event_cash_movements for delete
  to authenticated
  using (public.is_admin());

-- Deduct/restore inventory stock when a linked sale is recorded or voided.
create function public.apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.inventory_item_id is not null and new.quantity is not null then
      update public.inventory_items
        set stock_quantity = stock_quantity - new.quantity,
            updated_at = now()
        where id = new.inventory_item_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.inventory_item_id is not null and old.quantity is not null then
      update public.inventory_items
        set stock_quantity = stock_quantity + old.quantity,
            updated_at = now()
        where id = old.inventory_item_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger event_cash_movements_apply_inventory
  after insert or delete on public.event_cash_movements
  for each row execute function public.apply_inventory_movement();

-- ============================================================
-- general_cash_flow (its own ledger, plus one rollup row per closed event)
-- ============================================================
create table public.general_cash_flow (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('ingreso', 'egreso')),
  category text not null,
  description text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  movement_date date not null default current_date,
  source text not null default 'manual' check (source in ('manual', 'evento')),
  event_id uuid references public.events (id),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.general_cash_flow enable row level security;

create policy "general_cash_flow_admin_only"
  on public.general_cash_flow for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- When an event's cash box is closed, roll its net result into general_cash_flow.
create function public.close_cash_box_rollup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_net numeric(10, 2);
  v_event_name text;
begin
  if new.status = 'cerrada' and old.status <> 'cerrada' then
    select coalesce(sum(case when type = 'ingreso' then amount else -amount end), 0) + new.opening_amount
      into v_net
      from public.event_cash_movements
      where cash_box_id = new.id;

    select name into v_event_name from public.events where id = new.event_id;

    insert into public.general_cash_flow (type, category, description, amount, movement_date, source, event_id, created_by)
    values (
      case when v_net >= 0 then 'ingreso' else 'egreso' end,
      'Evento',
      'Cierre de caja: ' || coalesce(v_event_name, ''),
      abs(v_net),
      current_date,
      'evento',
      new.event_id,
      new.closed_by
    );
  end if;
  return new;
end;
$$;

create trigger event_cash_boxes_close_rollup
  after update on public.event_cash_boxes
  for each row execute function public.close_cash_box_rollup();

-- ============================================================
-- table privileges (RLS policies above decide which rows; these grants decide
-- whether the role may touch the table at all)
-- ============================================================
grant select, insert, update, delete on
  public.profiles,
  public.inventory_items,
  public.events,
  public.event_cash_boxes,
  public.event_cash_movements,
  public.general_cash_flow
to authenticated;
