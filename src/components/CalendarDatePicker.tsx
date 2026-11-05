import { createMemo, createSignal, For } from "solid-js";
import { monthLabelEs, toLocalIsoDate, todayIsoDate } from "~/lib/date";

const WEEKDAY_LABELS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type DayCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
  isPast: boolean;
  isOccupied: boolean;
};

export default function CalendarDatePicker(props: {
  value: string | null;
  onChange: (iso: string) => void;
  /** ISO dates (yyyy-mm-dd) that cannot be selected because another event already occupies them. */
  occupiedDates: Set<string>;
  /** Disallow picking days before today. Defaults to true. */
  disallowPast?: boolean;
}) {
  const disallowPast = props.disallowPast ?? true;
  const initial = props.value ? new Date(props.value + "T00:00:00") : new Date();
  const [cursor, setCursor] = createSignal(new Date(initial.getFullYear(), initial.getMonth(), 1));
  const today = todayIsoDate();

  const weeks = createMemo(() => {
    const monthStart = cursor();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: DayCell[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      const d = new Date(year, month, 1 - (firstWeekday - i));
      cells.push(dayCell(d, false));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(dayCell(new Date(year, month, day), true));
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const d = new Date(last.iso + "T00:00:00");
      d.setDate(d.getDate() + 1);
      cells.push(dayCell(d, false));
    }

    const result: DayCell[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      result.push(cells.slice(i, i + 7));
    }
    return result;
  });

  function dayCell(d: Date, inCurrentMonth: boolean): DayCell {
    const iso = toLocalIsoDate(d);
    return {
      iso,
      day: d.getDate(),
      inCurrentMonth,
      isPast: disallowPast && iso < today,
      isOccupied: props.occupiedDates.has(iso) && iso !== props.value,
    };
  }

  function changeMonth(delta: number) {
    setCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  }

  return (
    <div class="card w-full max-w-sm p-4">
      <div class="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          class="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
          aria-label="Mes anterior"
        >
          ‹
        </button>
        <span class="font-medium text-stone-900">{monthLabelEs(cursor().getFullYear(), cursor().getMonth())}</span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          class="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
          aria-label="Mes siguiente"
        >
          ›
        </button>
      </div>
      <div class="grid grid-cols-7 gap-1 text-center text-xs font-medium text-stone-400">
        <For each={WEEKDAY_LABELS_ES}>{label => <div class="py-1">{label}</div>}</For>
      </div>
      <For each={weeks()}>
        {week => (
          <div class="grid grid-cols-7 gap-1">
            <For each={week}>
              {cell => {
                const disabled = !cell.inCurrentMonth || cell.isPast || cell.isOccupied;
                const selected = cell.iso === props.value;
                return (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => props.onChange(cell.iso)}
                    title={cell.isOccupied ? "Fecha ocupada por otro evento" : undefined}
                    classList={{
                      "aspect-square rounded-lg text-sm transition-colors": true,
                      "text-stone-300": !cell.inCurrentMonth,
                      "bg-black text-white font-semibold": selected,
                      "bg-blue-50 text-blue-700 line-through cursor-not-allowed":
                        !selected && cell.inCurrentMonth && cell.isOccupied,
                      "bg-green-50 text-green-700 hover:bg-green-100":
                        !selected && cell.inCurrentMonth && !cell.isOccupied && !cell.isPast,
                      "text-stone-300 cursor-not-allowed":
                        !selected && cell.inCurrentMonth && cell.isPast && !cell.isOccupied,
                    }}
                  >
                    {cell.day}
                  </button>
                );
              }}
            </For>
          </div>
        )}
      </For>
      <div class="mt-3 flex flex-wrap items-center gap-4 text-xs text-stone-500">
        <span class="flex items-center gap-1">
          <span class="inline-block h-3 w-3 rounded bg-black" /> Seleccionado
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-3 w-3 rounded bg-green-50 ring-1 ring-green-200" /> Disponible
        </span>
        <span class="flex items-center gap-1">
          <span class="inline-block h-3 w-3 rounded bg-blue-50 ring-1 ring-blue-200" /> Ocupado
        </span>
      </div>
    </div>
  );
}
