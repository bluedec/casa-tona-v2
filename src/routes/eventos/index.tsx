import { createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import Protected from "~/components/Protected";
import EventsCalendar, { type CalendarEventRow } from "~/components/EventsCalendar";
import DayPanel from "~/components/DayPanel";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { eventStatusMeta } from "~/lib/eventStatus";
import { formatDateEs } from "~/lib/date";

async function fetchEvents() {
  const { data, error } = await supabase.from("events").select("*").order("event_date", { ascending: true });
  if (error) throw error;
  return data;
}

export default function EventosList() {
  return (
    <Protected>
      <EventosListContent />
    </Protected>
  );
}

function EventosListContent() {
  const { isAdmin } = useAuth();
  const [events, { refetch }] = createResource(fetchEvents);
  const [selectedDay, setSelectedDay] = createSignal<{ iso: string; event: CalendarEventRow | undefined } | null>(
    null,
  );

  async function handleDelete(id: string, name: string) {
    if (!confirm(`¿Eliminar el evento "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    refetch();
  }

  return (
    <main class="mx-auto max-w-5xl p-4">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-stone-900">Eventos</h1>
        <Show when={isAdmin()}>
          <A href="/eventos/nuevo" class="btn-primary">
            + Nuevo evento
          </A>
        </Show>
      </div>

      <div class="mb-6">
        <EventsCalendar
          events={events() ?? []}
          canSchedule={isAdmin()}
          onDaySelect={(iso, event) => setSelectedDay({ iso, event })}
        />
      </div>

      <DayPanel
        date={selectedDay()?.iso ?? null}
        event={selectedDay()?.event}
        canCreate={isAdmin()}
        onClose={() => setSelectedDay(null)}
      />

      <Show when={!events.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
        <Show when={(events() ?? []).length > 0} fallback={<p class="text-stone-500">No hay eventos registrados.</p>}>
          <div class="card overflow-x-auto">
            <table class="w-full text-left text-sm">
              <thead class="bg-stone-50 text-stone-500">
                <tr>
                  <th class="px-4 py-3">Fecha</th>
                  <th class="px-4 py-3">Evento</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Estado</th>
                  <th class="px-4 py-3">Total</th>
                  <th class="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                <For each={events()}>
                  {ev => {
                    const meta = eventStatusMeta(ev.status);
                    return (
                      <tr class="border-t border-stone-100">
                        <td class="whitespace-nowrap px-4 py-3">{formatDateEs(ev.event_date)}</td>
                        <td class="px-4 py-3">{ev.name}</td>
                        <td class="px-4 py-3">{ev.client_name}</td>
                        <td class="px-4 py-3">
                          <span class={`rounded-full px-2 py-1 text-xs font-medium ${meta.classes}`}>{meta.label}</span>
                        </td>
                        <td class="px-4 py-3">{ev.total_price != null ? `$${ev.total_price}` : "—"}</td>
                        <td class="space-x-3 whitespace-nowrap px-4 py-3 text-right">
                          <A href={`/eventos/${ev.id}`} class="link">
                            Ver
                          </A>
                          <A href={`/eventos/${ev.id}/caja`} class="link">
                            Caja
                          </A>
                          <Show when={isAdmin()}>
                            <button onClick={() => handleDelete(ev.id, ev.name)} class="text-red-600 hover:underline">
                              Eliminar
                            </button>
                          </Show>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </Show>
    </main>
  );
}
