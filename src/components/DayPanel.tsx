import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import { A, useNavigate } from "@solidjs/router";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { EVENT_STATUSES, eventStatusMeta, type EventStatus } from "~/lib/eventStatus";
import { formatDateEs } from "~/lib/date";
import type { CalendarEventRow } from "~/components/EventsCalendar";

export default function DayPanel(props: {
  date: string | null;
  event: CalendarEventRow | undefined;
  canCreate: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { session } = useAuth();

  const [name, setName] = createSignal("");
  const [clientName, setClientName] = createSignal("");
  const [clientPhone, setClientPhone] = createSignal("");
  const [startTime, setStartTime] = createSignal("");
  const [endTime, setEndTime] = createSignal("");
  const [status, setStatus] = createSignal<EventStatus>("reservado");
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  createEffect(() => {
    // Reset the quick-create form whenever a different day is opened.
    props.date;
    setName("");
    setClientName("");
    setClientPhone("");
    setStartTime("");
    setEndTime("");
    setStatus("reservado");
    setError(null);
  });

  createEffect(() => {
    if (!props.date) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") props.onClose();
    }
    window.addEventListener("keydown", handleKey);
    onCleanup(() => window.removeEventListener("keydown", handleKey));
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!props.date) return;
    setError(null);
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("events")
      .insert({
        name: name(),
        client_name: clientName(),
        client_phone: clientPhone() || null,
        event_date: props.date,
        start_time: startTime() || null,
        end_time: endTime() || null,
        status: status(),
        created_by: session()?.user.id,
      })
      .select("id")
      .single();
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    // Don't touch this page's state (close panel / refetch its list) after
    // this point: we're navigating away, and doing so right as this
    // component unmounts leaves the URL updated but the route content stale
    // (a disposed-resource update breaks solid-router's route swap).
    navigate(`/eventos/${data.id}`);
  }

  return (
    <Show when={props.date}>
      <div class="fixed inset-0 z-40 flex justify-end">
        <div class="absolute inset-0 bg-black/30" onClick={props.onClose} />
        <aside class="relative z-50 flex h-full w-full max-w-sm flex-col overflow-y-auto bg-white p-6 shadow-xl">
          <div class="mb-4 flex items-center justify-between">
            <h2 class="text-lg font-semibold text-stone-900">{formatDateEs(props.date!)}</h2>
            <button
              type="button"
              onClick={props.onClose}
              class="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>

          <Show
            when={props.event}
            fallback={
              <Show
                when={props.canCreate}
                fallback={<p class="text-sm text-stone-500">No hay ningún evento programado para este día.</p>}
              >
                <form onSubmit={handleCreate} class="space-y-3">
                  <p class="text-sm text-stone-500">No hay ningún evento este día. Agenda uno nuevo:</p>
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-stone-700">Nombre del evento</label>
                    <input required value={name()} onInput={e => setName(e.currentTarget.value)} class="field" />
                  </div>
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-stone-700">Cliente</label>
                    <input
                      required
                      value={clientName()}
                      onInput={e => setClientName(e.currentTarget.value)}
                      class="field"
                    />
                  </div>
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-stone-700">Teléfono</label>
                    <input value={clientPhone()} onInput={e => setClientPhone(e.currentTarget.value)} class="field" />
                  </div>
                  <div class="grid grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="block text-sm font-medium text-stone-700">Hora inicio</label>
                      <input
                        type="time"
                        value={startTime()}
                        onInput={e => setStartTime(e.currentTarget.value)}
                        class="field"
                      />
                    </div>
                    <div class="space-y-1">
                      <label class="block text-sm font-medium text-stone-700">Hora fin</label>
                      <input
                        type="time"
                        value={endTime()}
                        onInput={e => setEndTime(e.currentTarget.value)}
                        class="field"
                      />
                    </div>
                  </div>
                  <div class="space-y-1">
                    <label class="block text-sm font-medium text-stone-700">Estado</label>
                    <select
                      value={status()}
                      onChange={e => setStatus(e.currentTarget.value as EventStatus)}
                      class="field"
                    >
                      {EVENT_STATUSES.filter(s => s.value !== "cancelado").map(s => (
                        <option value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <Show when={error()}>
                    <p class="text-sm text-red-600">{error()}</p>
                  </Show>
                  <button type="submit" disabled={saving()} class="btn-primary w-full">
                    {saving() ? "Creando..." : "Crear evento"}
                  </button>
                  <p class="text-xs text-stone-400">
                    Podrás agregar invitados, precio y notas desde la página del evento.
                  </p>
                </form>
              </Show>
            }
          >
            {event => {
              const meta = () => eventStatusMeta(event().status);
              return (
                <div class="space-y-4">
                  <div>
                    <span class={`inline-block rounded-full px-2 py-1 text-xs font-medium ${meta().classes}`}>
                      {meta().label}
                    </span>
                    <h3 class="mt-2 text-xl font-semibold text-stone-900">{event().name}</h3>
                  </div>
                  <dl class="space-y-2 text-sm">
                    <div class="flex justify-between gap-4">
                      <dt class="text-stone-500">Cliente</dt>
                      <dd class="text-right text-stone-900">{event().client_name}</dd>
                    </div>
                    <Show when={event().client_phone}>
                      <div class="flex justify-between gap-4">
                        <dt class="text-stone-500">Teléfono</dt>
                        <dd class="text-right text-stone-900">{event().client_phone}</dd>
                      </div>
                    </Show>
                    <Show when={event().start_time}>
                      <div class="flex justify-between gap-4">
                        <dt class="text-stone-500">Horario</dt>
                        <dd class="text-right text-stone-900">
                          {event().start_time!.slice(0, 5)}
                          {event().end_time ? ` – ${event().end_time!.slice(0, 5)}` : ""}
                        </dd>
                      </div>
                    </Show>
                    <Show when={event().expected_guests != null}>
                      <div class="flex justify-between gap-4">
                        <dt class="text-stone-500">Invitados</dt>
                        <dd class="text-right text-stone-900">{event().expected_guests}</dd>
                      </div>
                    </Show>
                    <Show when={event().total_price != null}>
                      <div class="flex justify-between gap-4">
                        <dt class="text-stone-500">Precio total</dt>
                        <dd class="text-right text-stone-900">${event().total_price}</dd>
                      </div>
                    </Show>
                  </dl>
                  <div class="flex flex-col gap-2 pt-2">
                    <A href={`/eventos/${event().id}`} class="btn-primary text-center">
                      Ver evento completo
                    </A>
                    <A href={`/eventos/${event().id}/caja`} class="btn-secondary text-center">
                      Caja del evento
                    </A>
                  </div>
                </div>
              );
            }}
          </Show>
        </aside>
      </div>
    </Show>
  );
}
