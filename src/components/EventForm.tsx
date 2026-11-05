import { createSignal, Show } from "solid-js";
import CalendarDatePicker from "~/components/CalendarDatePicker";
import CurrencyInput from "~/components/CurrencyInput";
import { EVENT_STATUSES, type EventStatus } from "~/lib/eventStatus";

export type EventFormValues = {
  name: string;
  client_name: string;
  client_phone: string;
  event_date: string;
  start_time: string;
  end_time: string;
  expected_guests: string;
  total_price: string;
  deposit_amount: string;
  status: EventStatus;
  notes: string;
};

export const emptyEventForm: EventFormValues = {
  name: "",
  client_name: "",
  client_phone: "",
  event_date: "",
  start_time: "",
  end_time: "",
  expected_guests: "",
  total_price: "",
  deposit_amount: "",
  status: "reservado",
  notes: "",
};

export default function EventForm(props: {
  initial: EventFormValues;
  occupiedDates: Set<string>;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => Promise<void> | void;
  readOnly?: boolean;
}) {
  const [values, setValues] = createSignal(props.initial);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  function set<K extends keyof EventFormValues>(key: K, v: EventFormValues[K]) {
    setValues(prev => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!values().event_date) {
      setError("Selecciona una fecha para el evento.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await props.onSubmit(values());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ocurrió un error al guardar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} class="grid gap-6 md:grid-cols-2">
      <fieldset disabled={props.readOnly} class="contents">
      <div class="space-y-4">
        <div class="space-y-1">
          <label class="block text-sm font-medium text-stone-700">Nombre del evento</label>
          <input
            required
            value={values().name}
            onInput={e => set("name", e.currentTarget.value)}
            class="field"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Cliente</label>
            <input
              required
              value={values().client_name}
              onInput={e => set("client_name", e.currentTarget.value)}
              class="field"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Teléfono</label>
            <input
              value={values().client_phone}
              onInput={e => set("client_phone", e.currentTarget.value)}
              class="field"
            />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Hora inicio</label>
            <input
              type="time"
              value={values().start_time}
              onInput={e => set("start_time", e.currentTarget.value)}
              class="field"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Hora fin</label>
            <input
              type="time"
              value={values().end_time}
              onInput={e => set("end_time", e.currentTarget.value)}
              class="field"
            />
          </div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Invitados</label>
            <input
              type="number"
              min="0"
              value={values().expected_guests}
              onInput={e => set("expected_guests", e.currentTarget.value)}
              class="field"
            />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Precio total</label>
            <CurrencyInput value={values().total_price} onInput={v => set("total_price", v)} />
          </div>
          <div class="space-y-1">
            <label class="block text-sm font-medium text-stone-700">Anticipo</label>
            <CurrencyInput
              value={values().deposit_amount}
              onInput={v => set("deposit_amount", v)}
            />
          </div>
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-stone-700">Estado</label>
          <select
            value={values().status}
            onChange={e => set("status", e.currentTarget.value as EventStatus)}
            class="field"
          >
            {EVENT_STATUSES.map(s => (
              <option value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div class="space-y-1">
          <label class="block text-sm font-medium text-stone-700">Notas</label>
          <textarea
            value={values().notes}
            onInput={e => set("notes", e.currentTarget.value)}
            rows="3"
            class="field"
          />
        </div>
      </div>

      <div class="space-y-3">
        <label class="block text-sm font-medium text-stone-700">Fecha del evento</label>
        <CalendarDatePicker
          value={values().event_date || null}
          onChange={iso => set("event_date", iso)}
          occupiedDates={props.occupiedDates}
        />
      </div>
      </fieldset>

      <Show when={!props.readOnly}>
        <div class="md:col-span-2">
          <Show when={error()}>
            <p class="mb-3 text-sm text-red-600">{error()}</p>
          </Show>
          <button type="submit" disabled={saving()} class="btn-primary">
            {saving() ? "Guardando..." : props.submitLabel}
          </button>
        </div>
      </Show>
    </form>
  );
}
