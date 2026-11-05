import { supabase } from "~/lib/supabase/client";

export async function fetchOccupiedDates(): Promise<Set<string>> {
  const { data, error } = await supabase.from("events").select("event_date").neq("status", "cancelado");
  if (error) throw error;
  return new Set((data ?? []).map(e => e.event_date));
}
