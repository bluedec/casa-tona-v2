import { createResource, createSignal, For, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import Protected from "~/components/Protected";
import CurrencyInput from "~/components/CurrencyInput";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import { formatDateEs } from "~/lib/date";

async function fetchEvent(id: string) {
  const { data, error } = await supabase.from("events").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

async function fetchCashBox(eventId: string) {
  const { data, error } = await supabase.from("event_cash_boxes").select("*").eq("event_id", eventId).maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchMovements(cashBoxId: string | undefined) {
  if (!cashBoxId) return [];
  const { data, error } = await supabase
    .from("event_cash_movements")
    .select("*")
    .eq("cash_box_id", cashBoxId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

async function fetchInventory() {
  const { data, error } = await supabase.from("inventory_items").select("*").order("name");
  if (error) throw error;
  return data;
}

export default function EventoCaja() {
  return (
    <Protected>
      <EventoCajaContent />
    </Protected>
  );
}

function EventoCajaContent() {
  const params = useParams();
  const id = params.id as string;
  const { session, isAdmin } = useAuth();
  const [event] = createResource(() => id, fetchEvent);
  const [cashBox, { refetch: refetchBox }] = createResource(() => id, fetchCashBox);
  const [movements, { refetch: refetchMovements }] = createResource(() => cashBox()?.id, fetchMovements);
  const [inventory, { refetch: refetchInventory }] = createResource(fetchInventory);

  const [opening, setOpening] = createSignal("0");
  const [saving, setSaving] = createSignal(false);
  const [formError, setFormError] = createSignal<string | null>(null);

  const [manualType, setManualType] = createSignal<"ingreso" | "egreso">("ingreso");
  const [manualDesc, setManualDesc] = createSignal("");
  const [manualAmount, setManualAmount] = createSignal("");

  const [saleItemId, setSaleItemId] = createSignal("");
  const [saleQty, setSaleQty] = createSignal("1");

  async function handleOpen(e: Event) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const { error } = await supabase.from("event_cash_boxes").insert({
      event_id: id,
      opening_amount: Number(opening()) || 0,
      opened_by: session()?.user.id,
    });
    setSaving(false);
    if (error) {
      setFormError(error.message);
      return;
    }
    refetchBox();
  }

  async function handleAddManual(e: Event) {
    e.preventDefault();
    const box = cashBox();
    if (!box || !manualDesc() || !manualAmount()) return;
    setFormError(null);
    const { error } = await supabase.from("event_cash_movements").insert({
      cash_box_id: box.id,
      type: manualType(),
      description: manualDesc(),
      amount: Number(manualAmount()),
      created_by: session()?.user.id,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setManualDesc("");
    setManualAmount("");
    refetchMovements();
  }

  async function handleAddSale(e: Event) {
    e.preventDefault();
    const box = cashBox();
    const item = (inventory() ?? []).find(i => i.id === saleItemId());
    if (!box || !item) return;
    const qty = Number(saleQty()) || 0;
    if (qty <= 0) return;
    setFormError(null);
    const { error } = await supabase.from("event_cash_movements").insert({
      cash_box_id: box.id,
      type: "ingreso",
      description: `Venta de ${item.name} x${qty}`,
      amount: Number((item.price * qty).toFixed(2)),
      inventory_item_id: item.id,
      quantity: qty,
      unit_price: item.price,
      created_by: session()?.user.id,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setSaleQty("1");
    refetchMovements();
    refetchInventory();
  }

  async function handleClose() {
    const box = cashBox();
    if (!box) return;
    if (!confirm("¿Cerrar la caja de este evento? Esto registrará el resultado en el flujo general.")) return;
    const { error } = await supabase
      .from("event_cash_boxes")
      .update({ status: "cerrada", closed_at: new Date().toISOString(), closed_by: session()?.user.id })
      .eq("id", box.id);
    if (error) {
      alert(error.message);
      return;
    }
    refetchBox();
  }

  const total = () => {
    const box = cashBox();
    if (!box) return 0;
    const movs = movements() ?? [];
    const net = movs.reduce((acc, m) => acc + (m.type === "ingreso" ? m.amount : -m.amount), 0);
    return box.opening_amount + net;
  };

  return (
    <main class="mx-auto max-w-4xl p-4">
      <div class="mb-6 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-stone-900">Caja del evento</h1>
          <Show when={event()}>
            <p class="text-sm text-stone-500">
              {event()!.name} — {formatDateEs(event()!.event_date)}
            </p>
          </Show>
        </div>
        <A href={`/eventos/${id}`} class="link">
          ← Volver al evento
        </A>
      </div>

      <Show when={!cashBox.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
        <Show
          when={cashBox()}
          fallback={
            <form onSubmit={handleOpen} class="card max-w-sm space-y-4 p-6">
              <h2 class="font-medium text-stone-800">Abrir caja</h2>
              <div class="space-y-1">
                <label class="block text-sm font-medium text-stone-700">Monto inicial</label>
                <CurrencyInput value={opening()} onInput={setOpening} />
              </div>
              <Show when={formError()}>
                <p class="text-sm text-red-600">{formError()}</p>
              </Show>
              <button type="submit" disabled={saving()} class="btn-primary">
                Abrir caja
              </button>
            </form>
          }
        >
          {box => (
            <div class="space-y-6">
              <div class="card flex items-center justify-between p-4">
                <div>
                  <p class="text-sm text-stone-500">Total en caja</p>
                  <p class="text-3xl font-semibold text-stone-900">${total().toFixed(2)}</p>
                </div>
                <div class="text-right">
                  <span
                    class={`rounded-full px-3 py-1 text-xs font-medium ${
                      box().status === "abierta" ? "bg-black text-white" : "bg-stone-100 text-stone-500"
                    }`}
                  >
                    {box().status === "abierta" ? "Abierta" : "Cerrada"}
                  </span>
                  <Show when={box().status === "abierta"}>
                    <div>
                      <button onClick={handleClose} class="mt-2 text-sm text-red-600 hover:underline">
                        Cerrar caja
                      </button>
                    </div>
                  </Show>
                </div>
              </div>

              <Show when={box().status === "abierta"}>
                <div class="grid gap-4 md:grid-cols-2">
                  <form onSubmit={handleAddSale} class="card space-y-3 p-4">
                    <div class="flex items-center justify-between">
                      <h3 class="font-medium text-stone-800">Venta de producto</h3>
                      <Show when={isAdmin()}>
                        <A href="/inventario" class="link text-xs">
                          Gestionar inventario
                        </A>
                      </Show>
                    </div>
                    <select
                      required
                      value={saleItemId()}
                      onChange={e => setSaleItemId(e.currentTarget.value)}
                      class="field"
                    >
                      <option value="" disabled>
                        Selecciona un producto
                      </option>
                      <For each={inventory()}>
                        {item => (
                          <option value={item.id}>
                            {item.name}
                            {item.volume_ml ? ` (${item.volume_ml} ml)` : ""} — ${item.price} ({item.stock_quantity}{" "}
                            disp.)
                          </option>
                        )}
                      </For>
                    </select>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={saleQty()}
                      onInput={e => setSaleQty(e.currentTarget.value)}
                      class="field"
                    />
                    <button type="submit" class="btn-primary">
                      Registrar venta
                    </button>
                  </form>

                  <form onSubmit={handleAddManual} class="card space-y-3 p-4">
                    <h3 class="font-medium text-stone-800">Movimiento manual</h3>
                    <select
                      value={manualType()}
                      onChange={e => setManualType(e.currentTarget.value as "ingreso" | "egreso")}
                      class="field"
                    >
                      <option value="ingreso">Ingreso</option>
                      <option value="egreso">Egreso</option>
                    </select>
                    <input
                      placeholder="Descripción"
                      value={manualDesc()}
                      onInput={e => setManualDesc(e.currentTarget.value)}
                      class="field"
                    />
                    <CurrencyInput placeholder="Monto" value={manualAmount()} onInput={setManualAmount} />
                    <button type="submit" class="btn-primary">
                      Agregar movimiento
                    </button>
                  </form>
                </div>
                <Show when={formError()}>
                  <p class="text-sm text-red-600">{formError()}</p>
                </Show>
              </Show>

              <div class="card overflow-x-auto">
                <table class="w-full text-left text-sm">
                  <thead class="bg-stone-50 text-stone-500">
                    <tr>
                      <th class="px-4 py-3">Hora</th>
                      <th class="px-4 py-3">Descripción</th>
                      <th class="px-4 py-3">Tipo</th>
                      <th class="px-4 py-3 text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={movements()}>
                      {m => (
                        <tr class="border-t border-stone-100">
                          <td class="whitespace-nowrap px-4 py-3">
                            {new Date(m.created_at).toLocaleTimeString("es-MX", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td class="px-4 py-3">{m.description}</td>
                          <td class="px-4 py-3">
                            <span class={m.type === "ingreso" ? "text-emerald-700" : "text-red-700"}>
                              {m.type === "ingreso" ? "Ingreso" : "Egreso"}
                            </span>
                          </td>
                          <td class="px-4 py-3 text-right">
                            {m.type === "ingreso" ? "+" : "-"}${m.amount}
                          </td>
                        </tr>
                      )}
                    </For>
                    <Show when={(movements() ?? []).length === 0}>
                      <tr>
                        <td colspan="4" class="px-4 py-6 text-center text-stone-400">
                          Sin movimientos todavía.
                        </td>
                      </tr>
                    </Show>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Show>
      </Show>
    </main>
  );
}
