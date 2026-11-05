-- Drinks (bebida/botella) can optionally record their volume in milliliters.
alter table public.inventory_items
  add column volume_ml integer check (volume_ml is null or volume_ml > 0);
