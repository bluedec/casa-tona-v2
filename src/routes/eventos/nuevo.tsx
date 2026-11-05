import { createResource, Show } from "solid-js";
import { useNavigate, useSearchParams } from "@solidjs/router";
import Protected from "~/components/Protected";
import EventForm, { emptyEventForm, type EventFormValues } from "~/components/EventForm";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { fetchOccupiedDates } from "~/lib/events";

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default function NuevoEvento() {
  return (
    <Protected adminOnly>
      <NuevoEventoContent />
    </Protected>
  );
}

function NuevoEventoContent() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [occupied] = createResource(fetchOccupiedDates);

  const prefilledDate = typeof searchParams.fecha === "string" && ISO_DATE_RE.test(searchParams.fecha)
    ? searchParams.fecha
    : "";

  async function handleSubmit(values: EventFormValues) {
    const { data, error } = await supabase
      .from("events")
      .insert({
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
        created_by: session()?.user.id,
      })
      .select("id")
      .single();
    if (error) throw error;
    navigate(`/eventos/${data.id}`);
  }

  return (
    <main class="mx-auto max-w-4xl p-4">
      <h1 class="mb-6 text-2xl font-semibold text-stone-900">Nuevo evento</h1>
      <Show when={!occupied.loading} fallback={<p class="text-stone-500">Cargando calendario...</p>}>
        <EventForm
          initial={{ ...emptyEventForm, event_date: prefilledDate }}
          occupiedDates={occupied() ?? new Set()}
          submitLabel="Crear evento"
          onSubmit={handleSubmit}
        />
      </Show>
    </main>
  );
}
