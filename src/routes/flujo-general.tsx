import { createMemo, createResource, createSignal, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import Protected from "~/components/Protected";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { formatDateEs, todayIsoDate } from "~/lib/date";

async function fetchMovements() {
  const { data, error } = await supabase
    .from("general_cash_flow")
    .select("*")
    .order("movement_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export default function FlujoGeneral() {
  return (
    <Protected adminOnly>
      <FlujoGeneralContent />
    </Protected>
  );
}

function FlujoGeneralContent() {
  const { session } = useAuth();
  const [movements, { refetch }] = createResource(fetchMovements);
  const [month, setMonth] = createSignal(todayIsoDate().slice(0, 7));

  const [type, setType] = createSignal<"ingreso" | "egreso">("ingreso");
  const [category, setCategory] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [amount, setAmount] = createSignal("");
  const [date, setDate] = createSignal(todayIsoDate());
  const [formError, setFormError] = createSignal<string | null>(null);

  const filtered = createMemo(() => (movements() ?? []).filter(m => m.movement_date.startsWith(month())));

  const totals = createMemo(() => {
    const rows = filtered();
    const ingreso = rows.filter(m => m.type === "ingreso").reduce((a, m) => a + m.amount, 0);
    const egreso = rows.filter(m => m.type === "egreso").reduce((a, m) => a + m.amount, 0);
    return { ingreso, egreso, neto: ingreso - egreso };
  });

  async function handleCreate(e: Event) {
    e.preventDefault();
    if (!category() || !description() || !amount()) return;
    setFormError(null);
    const { error } = await supabase.from("general_cash_flow").insert({
      type: type(),
      category: category(),
      description: description(),
      amount: Number(amount()),
      movement_date: date(),
      source: "manual",
      created_by: session()?.user.id,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setCategory("");
    setDescription("");
    setAmount("");
    refetch();
  }

  return (
    <main class="mx-auto max-w-5xl p-4">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 class="text-2xl font-semibold text-stone-900">Flujo de caja general</h1>
        <input type="month" value={month()} onInput={e => setMonth(e.currentTarget.value)} class="field w-auto" />
      </div>

      <div class="mb-6 grid gap-4 sm:grid-cols-3">
        <div class="card p-4">
          <p class="text-sm text-stone-500">Ingresos del mes</p>
          <p class="text-2xl font-semibold text-emerald-700">${totals().ingreso.toFixed(2)}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">Egresos del mes</p>
          <p class="text-2xl font-semibold text-red-700">${totals().egreso.toFixed(2)}</p>
        </div>
        <div class="card p-4">
          <p class="text-sm text-stone-500">Neto del mes</p>
          <p class="text-2xl font-semibold text-stone-900">${totals().neto.toFixed(2)}</p>
        </div>
      </div>

      <form onSubmit={handleCreate} class="card mb-6 grid gap-3 p-4 md:grid-cols-6">
        <select value={type()} onChange={e => setType(e.currentTarget.value as "ingreso" | "egreso")} class="field">
          <option value="ingreso">Ingreso</option>
          <option value="egreso">Egreso</option>
        </select>
        <input
          required
          placeholder="Categoría"
          value={category()}
          onInput={e => setCategory(e.currentTarget.value)}
          class="field"
        />
        <input
          required
          placeholder="Descripción"
          value={description()}
          onInput={e => setDescription(e.currentTarget.value)}
          class="field md:col-span-2"
        />
        <input
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="Monto"
          value={amount()}
          onInput={e => setAmount(e.currentTarget.value)}
          class="field"
        />
        <input type="date" value={date()} onInput={e => setDate(e.currentTarget.value)} class="field" />
        <div class="md:col-span-6">
          <Show when={formError()}>
            <p class="mb-2 text-sm text-red-600">{formError()}</p>
          </Show>
          <button type="submit" class="btn-primary">
            Agregar movimiento
          </button>
        </div>
      </form>

      <Show when={!movements.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
        <div class="card overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-stone-50 text-stone-500">
              <tr>
                <th class="px-4 py-3">Fecha</th>
                <th class="px-4 py-3">Categoría</th>
                <th class="px-4 py-3">Descripción</th>
                <th class="px-4 py-3">Origen</th>
                <th class="px-4 py-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody>
              <For each={filtered()}>
                {m => (
                  <tr class="border-t border-stone-100">
                    <td class="whitespace-nowrap px-4 py-3">{formatDateEs(m.movement_date)}</td>
                    <td class="px-4 py-3">{m.category}</td>
                    <td class="px-4 py-3">{m.description}</td>
                    <td class="px-4 py-3">
                      <Show
                        when={m.source === "evento" && m.event_id}
                        fallback={<span class="text-stone-400">Manual</span>}
                      >
                        <A href={`/eventos/${m.event_id}`} class="link">
                          Evento
                        </A>
                      </Show>
                    </td>
                    <td class={`px-4 py-3 text-right ${m.type === "ingreso" ? "text-emerald-700" : "text-red-700"}`}>
                      {m.type === "ingreso" ? "+" : "-"}${m.amount}
                    </td>
                  </tr>
                )}
              </For>
              <Show when={filtered().length === 0}>
                <tr>
                  <td colspan="5" class="px-4 py-6 text-center text-stone-400">
                    Sin movimientos este mes.
                  </td>
                </tr>
              </Show>
            </tbody>
          </table>
        </div>
      </Show>
    </main>
  );
}
