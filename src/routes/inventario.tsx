import { createResource, createSignal, For, Show } from "solid-js";
import Protected from "~/components/Protected";
import { supabase } from "~/lib/supabase/client";
import { useAuth } from "~/lib/auth";
import type { Tables } from "~/types/database";

type InventoryItem = Tables<"inventory_items">;

const CATEGORY_LABELS: Record<string, string> = {
  bebida: "Bebida",
  botella: "Botella",
  comida: "Comida",
  otro: "Otro",
};

async function fetchInventory() {
  const { data, error } = await supabase.from("inventory_items").select("*").order("category").order("name");
  if (error) throw error;
  return data;
}

export default function Inventario() {
  return (
    <Protected>
      <InventarioContent />
    </Protected>
  );
}

function InventarioContent() {
  const { isAdmin } = useAuth();
  const [items, { refetch }] = createResource(fetchInventory);
  const [showNewForm, setShowNewForm] = createSignal(false);

  const [newName, setNewName] = createSignal("");
  const [newCategory, setNewCategory] = createSignal("bebida");
  const [newUnit, setNewUnit] = createSignal("unidad");
  const [newPrice, setNewPrice] = createSignal("0");
  const [newStock, setNewStock] = createSignal("0");
  const [newThreshold, setNewThreshold] = createSignal("5");
  const [formError, setFormError] = createSignal<string | null>(null);

  async function handleCreate(e: Event) {
    e.preventDefault();
    setFormError(null);
    const { error } = await supabase.from("inventory_items").insert({
      name: newName(),
      category: newCategory() as InventoryItem["category"],
      unit: newUnit(),
      price: Number(newPrice()) || 0,
      stock_quantity: Number(newStock()) || 0,
      low_stock_threshold: Number(newThreshold()) || 0,
    });
    if (error) {
      setFormError(error.message);
      return;
    }
    setNewName("");
    setNewPrice("0");
    setNewStock("0");
    setShowNewForm(false);
    refetch();
  }

  async function updateField(item: InventoryItem, field: "price" | "stock_quantity", value: string) {
    const num = Number(value);
    if (Number.isNaN(num)) return;
    const patch = field === "price" ? { price: num } : { stock_quantity: num };
    const { error } = await supabase.from("inventory_items").update(patch).eq("id", item.id);
    if (error) {
      alert(error.message);
      return;
    }
    refetch();
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`¿Eliminar "${item.name}" del inventario?`)) return;
    const { error } = await supabase.from("inventory_items").delete().eq("id", item.id);
    if (error) {
      alert(error.message);
      return;
    }
    refetch();
  }

  return (
    <main class="mx-auto max-w-5xl p-4">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-semibold text-stone-900">Inventario</h1>
        <Show when={isAdmin()}>
          <button onClick={() => setShowNewForm(s => !s)} class="btn-primary">
            {showNewForm() ? "Cancelar" : "+ Nuevo producto"}
          </button>
        </Show>
      </div>

      <Show when={showNewForm()}>
        <form onSubmit={handleCreate} class="card mb-6 grid gap-3 p-4 md:grid-cols-5">
          <input
            required
            placeholder="Nombre"
            value={newName()}
            onInput={e => setNewName(e.currentTarget.value)}
            class="field md:col-span-2"
          />
          <select value={newCategory()} onChange={e => setNewCategory(e.currentTarget.value)} class="field">
            <For each={Object.entries(CATEGORY_LABELS)}>{([value, label]) => <option value={value}>{label}</option>}</For>
          </select>
          <input
            placeholder="Unidad (ej. botella, lata)"
            value={newUnit()}
            onInput={e => setNewUnit(e.currentTarget.value)}
            class="field"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio"
            value={newPrice()}
            onInput={e => setNewPrice(e.currentTarget.value)}
            class="field"
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Stock inicial"
            value={newStock()}
            onInput={e => setNewStock(e.currentTarget.value)}
            class="field"
          />
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Alerta de stock bajo"
            value={newThreshold()}
            onInput={e => setNewThreshold(e.currentTarget.value)}
            class="field"
          />
          <div class="md:col-span-5">
            <Show when={formError()}>
              <p class="mb-2 text-sm text-red-600">{formError()}</p>
            </Show>
            <button type="submit" class="btn-primary">
              Guardar producto
            </button>
          </div>
        </form>
      </Show>

      <Show when={!items.loading} fallback={<p class="text-stone-500">Cargando...</p>}>
        <div class="card overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-stone-50 text-stone-500">
              <tr>
                <th class="px-4 py-3">Producto</th>
                <th class="px-4 py-3">Categoría</th>
                <th class="px-4 py-3">Unidad</th>
                <th class="px-4 py-3">Precio</th>
                <th class="px-4 py-3">Stock</th>
                <th class="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              <For each={items()}>
                {item => {
                  const lowStock = item.stock_quantity <= item.low_stock_threshold;
                  return (
                    <tr class="border-t border-stone-100">
                      <td class="px-4 py-3">{item.name}</td>
                      <td class="px-4 py-3">{CATEGORY_LABELS[item.category] ?? item.category}</td>
                      <td class="px-4 py-3">{item.unit}</td>
                      <td class="px-4 py-3">
                        <Show when={isAdmin()} fallback={`$${item.price}`}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.price}
                            onChange={e => updateField(item, "price", e.currentTarget.value)}
                            class="field w-24 py-1"
                          />
                        </Show>
                      </td>
                      <td class="px-4 py-3">
                        <Show when={isAdmin()} fallback={<span class={lowStock ? "text-red-600" : ""}>{item.stock_quantity}</span>}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={item.stock_quantity}
                            onChange={e => updateField(item, "stock_quantity", e.currentTarget.value)}
                            class={`field w-24 py-1 ${lowStock ? "border-red-300 text-red-600" : ""}`}
                          />
                        </Show>
                        <Show when={lowStock}>
                          <span class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Stock bajo</span>
                        </Show>
                      </td>
                      <td class="px-4 py-3 text-right">
                        <Show when={isAdmin()}>
                          <button onClick={() => handleDelete(item)} class="text-red-600 hover:underline">
                            Eliminar
                          </button>
                        </Show>
                      </td>
                    </tr>
                  );
                }}
              </For>
              <Show when={(items() ?? []).length === 0}>
                <tr>
                  <td colspan="6" class="px-4 py-6 text-center text-stone-400">
                    No hay productos en el inventario.
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
