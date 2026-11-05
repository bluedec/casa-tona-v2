import { createMemo, createResource, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import Protected from "~/components/Protected";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { eventStatusMeta } from "~/lib/eventStatus";
import { formatDateEs, toLocalIsoDate, todayIsoDate } from "~/lib/date";

async function fetchUpcomingEvents() {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .neq("status", "cancelado")
    .gte("event_date", todayIsoDate())
    .order("event_date", { ascending: true })
    .limit(5);
  if (error) throw error;
  return data;
}

async function fetchLowStock() {
  const { data, error } = await supabase.from("inventory_items").select("*").order("name");
  if (error) throw error;
  return (data ?? []).filter(item => item.stock_quantity <= item.low_stock_threshold);
}

async function fetchMonthCashFlow() {
  const now = new Date();
  const monthStart = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const nextMonthStart = toLocalIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
  const { data, error } = await supabase
    .from("general_cash_flow")
    .select("type, amount")
    .gte("movement_date", monthStart)
    .lt("movement_date", nextMonthStart);
  if (error) throw error;
  const ingreso = (data ?? []).filter(m => m.type === "ingreso").reduce((a, m) => a + m.amount, 0);
  const egreso = (data ?? []).filter(m => m.type === "egreso").reduce((a, m) => a + m.amount, 0);
  return { ingreso, egreso, neto: ingreso - egreso };
}

export default function Dashboard() {
  return (
    <Protected>
      <DashboardContent />
    </Protected>
  );
}

function DashboardContent() {
  const { isAdmin } = useAuth();
  const [events] = createResource(fetchUpcomingEvents);
  const [lowStock] = createResource(fetchLowStock);
  const [cashFlow] = createResource(() => isAdmin(), admin => (admin ? fetchMonthCashFlow() : null));
  const monthLabel = createMemo(() =>
    new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" }),
  );

  return (
    <main class="mx-auto max-w-5xl space-y-6 p-4">
      <h1 class="text-2xl font-semibold text-stone-900">Resumen</h1>

      <Show when={isAdmin() && cashFlow()}>
        {cf => (
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="card p-4">
              <p class="text-sm text-stone-500">Ingresos de {monthLabel()}</p>
              <p class="text-2xl font-semibold text-emerald-700">${cf().ingreso.toFixed(2)}</p>
            </div>
            <div class="card p-4">
              <p class="text-sm text-stone-500">Egresos de {monthLabel()}</p>
              <p class="text-2xl font-semibold text-red-700">${cf().egreso.toFixed(2)}</p>
            </div>
            <div class="card p-4">
              <p class="text-sm text-stone-500">Neto de {monthLabel()}</p>
              <p class="text-2xl font-semibold text-stone-900">${cf().neto.toFixed(2)}</p>
            </div>
          </div>
        )}
      </Show>

      <div class="grid gap-6 md:grid-cols-2">
        <section class="card p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-medium text-stone-800">Próximos eventos</h2>
            <A href="/eventos" class="link text-sm">
              Ver todos
            </A>
          </div>
          <Show when={!events.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
            <Show when={(events() ?? []).length > 0} fallback={<p class="text-sm text-stone-400">No hay eventos próximos.</p>}>
              <ul class="space-y-2">
                <For each={events()}>
                  {ev => {
                    const meta = eventStatusMeta(ev.status);
                    return (
                      <li>
                        <A href={`/eventos/${ev.id}`} class="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-stone-50">
                          <span>
                            <span class="font-medium text-stone-800">{ev.name}</span>
                            <span class="ml-2 text-sm text-stone-500">{formatDateEs(ev.event_date)}</span>
                          </span>
                          <span class={`rounded-full px-2 py-1 text-xs font-medium ${meta.classes}`}>{meta.label}</span>
                        </A>
                      </li>
                    );
                  }}
                </For>
              </ul>
            </Show>
          </Show>
        </section>

        <section class="card p-4">
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-medium text-stone-800">Alertas de inventario</h2>
            <A href="/inventario" class="link text-sm">
              Ver inventario
            </A>
          </div>
          <Show when={!lowStock.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
            <Show when={(lowStock() ?? []).length > 0} fallback={<p class="text-sm text-stone-400">Todo el stock está en niveles normales.</p>}>
              <ul class="space-y-2">
                <For each={lowStock()}>
                  {item => (
                    <li class="flex items-center justify-between px-2 py-2">
                      <span class="text-stone-800">{item.name}</span>
                      <span class="text-sm text-red-600">{item.stock_quantity} {item.unit}</span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </Show>
        </section>
      </div>
    </main>
  );
}
