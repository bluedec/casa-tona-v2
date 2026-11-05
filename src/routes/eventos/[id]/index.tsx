import { createResource, Show } from "solid-js";
import { A, useNavigate, useParams } from "@solidjs/router";
import Protected from "~/components/Protected";
import EventForm, { type EventFormValues } from "~/components/EventForm";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { fetchOccupiedDates } from "~/lib/events";

async function fetchEvent(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export default function EventoDetalle() {
  return (
    <Protected>
      <EventoDetalleContent />
    </Protected>
  );
}

function EventoDetalleContent() {
  const params = useParams();
  const id = params.id as string;
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [event] = createResource(() => id, fetchEvent);
  const [occupied] = createResource(fetchOccupiedDates);

  async function handleSubmit(values: EventFormValues) {
    const { error } = await supabase
      .from("events")
      .update({
        name: values.name,
        client_name: values.client_name,
        client_phone: values.client_phone || null,
        event_date: values.event_date,
        start_time: values.start_time || null,
        end_time: values.end_time || null,
        expected_guests: values.expected_guests ? Number(values.expected_guests) : null,
        total_price: values.total_price ? Number(values.total_price) : null,
        deposit_amount: values.deposit_amount ? Number(values.deposit_amount) : null,
        status: values.status,
        notes: values.notes || null,
      })
      .eq("id", id);
    if (error) throw error;
    navigate("/eventos");
  }

  async function handleDelete() {
    const name = event()?.name ?? "";
    if (!confirm(`¿Eliminar el evento "${name}"? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      alert(error.message);
      return;
    }
    navigate("/eventos");
  }

  return (
    <main class="mx-auto max-w-4xl p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-stone-900">{isAdmin() ? "Editar evento" : "Evento"}</h1>
        <div class="flex gap-3">
          <A href={`/eventos/${id}/caja`} class="btn-secondary">
            Caja del evento
          </A>
          <Show when={isAdmin()}>
            <button
              onClick={handleDelete}
              class="rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
            >
              Eliminar
            </button>
          </Show>
        </div>
      </div>
      <Show when={event() && !occupied.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
        {_ => {
          const ev = event()!;
          return (
            <EventForm
              initial={{
                name: ev.name,
                client_name: ev.client_name,
                client_phone: ev.client_phone ?? "",
                event_date: ev.event_date,
                start_time: ev.start_time ?? "",
                end_time: ev.end_time ?? "",
                expected_guests: ev.expected_guests?.toString() ?? "",
                total_price: ev.total_price?.toString() ?? "",
                deposit_amount: ev.deposit_amount?.toString() ?? "",
                status: ev.status as EventFormValues["status"],
                notes: ev.notes ?? "",
              }}
              occupiedDates={occupied() ?? new Set()}
              submitLabel="Guardar cambios"
              onSubmit={handleSubmit}
              readOnly={!isAdmin()}
            />
          );
        }}
      </Show>
    </main>
  );
}
