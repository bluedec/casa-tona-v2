import { createMemo, createSignal, For, Show } from "solid-js";
import { eventStatusMeta } from "~/lib/eventStatus";
import { monthLabelEs, shortDayLabelEs, startOfWeek, toLocalIsoDate, todayIsoDate, weekdayLabelEs } from "~/lib/date";
import type { Tables } from "~/types/database";

export type CalendarEventRow = Tables<"events">;

const WEEKDAY_LABELS_SHORT_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type ViewMode = "week" | "month";

type DayInfo = {
  iso: string;
  dayNumber: number;
  weekday: string;
  isToday: boolean;
  isPast: boolean;
  inCurrentPeriod: boolean;
  event: CalendarEventRow | undefined;
};

export default function EventsCalendar(props: {
  events: CalendarEventRow[];
  canSchedule?: boolean;
  onDaySelect: (iso: string, event: CalendarEventRow | undefined) => void;
}) {
  const [mode, setMode] = createSignal<ViewMode>("month");
  const [weekCursor, setWeekCursor] = createSignal(startOfWeek(new Date()));
  const [monthCursor, setMonthCursor] = createSignal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const today = todayIsoDate();

  function findEvent(iso: string) {
    return props.events.find(e => e.event_date === iso && e.status !== "cancelado");
  }

  function buildDay(d: Date, inCurrentPeriod: boolean): DayInfo {
    const iso = toLocalIsoDate(d);
    return {
      iso,
      dayNumber: d.getDate(),
      weekday: weekdayLabelEs(d.getDay()),
      isToday: iso === today,
      isPast: iso < today,
      inCurrentPeriod,
      event: inCurrentPeriod ? findEvent(iso) : undefined,
    };
  }

  const weekDays = createMemo(() => {
    const start = weekCursor();
    return Array.from({ length: 7 }, (_, i) =>
      buildDay(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i), true),
    );
  });

  const monthWeeks = createMemo(() => {
    const monthStart = monthCursor();
    const year = monthStart.getFullYear();
    const month = monthStart.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: DayInfo[] = [];
    for (let i = 0; i < firstWeekday; i++) {
      cells.push(buildDay(new Date(year, month, 1 - (firstWeekday - i)), false));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      cells.push(buildDay(new Date(year, month, day), true));
    }
    let trailing = 1;
    while (cells.length % 7 !== 0) {
      cells.push(buildDay(new Date(year, month + 1, trailing), false));
      trailing++;
    }

    const result: DayInfo[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  });

  const rangeLabel = createMemo(() => {
    if (mode() === "month") return monthLabelEs(monthCursor().getFullYear(), monthCursor().getMonth());
    const start = weekCursor();
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
    return `${shortDayLabelEs(start)} – ${shortDayLabelEs(end)} de ${end.getFullYear()}`;
  });

  function changePeriod(delta: number) {
    if (mode() === "month") setMonthCursor(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    else setWeekCursor(c => new Date(c.getFullYear(), c.getMonth(), c.getDate() + delta * 7));
  }

  function goToday() {
    setWeekCursor(startOfWeek(new Date()));
    setMonthCursor(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  }

  function canScheduleDay(day: DayInfo) {
    return day.inCurrentPeriod && !day.isPast && Boolean(props.canSchedule);
  }

  return (
    <div class="card p-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePeriod(-1)}
            class="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            aria-label="Anterior"
          >
            ‹
          </button>
          <span class="min-w-[11rem] text-center font-medium text-stone-900">{rangeLabel()}</span>
          <button
            type="button"
            onClick={() => changePeriod(1)}
            class="rounded-md px-2 py-1 text-stone-500 hover:bg-stone-100"
            aria-label="Siguiente"
          >
            ›
          </button>
          <button
            type="button"
            onClick={goToday}
            class="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-100"
          >
            Hoy
          </button>
        </div>
        <div class="flex rounded-lg border border-stone-300 p-0.5 text-sm">
          <button
            type="button"
            onClick={() => setMode("week")}
            classList={{
              "rounded-md px-3 py-1 transition-colors": true,
              "bg-black text-white": mode() === "week",
              "text-stone-600 hover:bg-stone-100": mode() !== "week",
            }}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setMode("month")}
            classList={{
              "rounded-md px-3 py-1 transition-colors": true,
              "bg-black text-white": mode() === "month",
              "text-stone-600 hover:bg-stone-100": mode() !== "month",
            }}
          >
            Mes
          </button>
        </div>
      </div>

      <Show
        when={mode() === "week"}
        fallback={
          <div>
            <div class="grid grid-cols-7 gap-2 text-center text-xs font-medium text-stone-400">
              <For each={WEEKDAY_LABELS_SHORT_ES}>{label => <div class="py-1">{label}</div>}</For>
            </div>
            <div class="space-y-2">
              <For each={monthWeeks()}>
                {week => (
                  <div class="grid grid-cols-7 gap-2">
                    <For each={week}>
                      {day => (
                        <DayCell
                          day={day}
                          compact
                          canSchedule={canScheduleDay(day)}
                          onSelect={props.onDaySelect}
                        />
                      )}
                    </For>
                  </div>
                )}
              </For>
            </div>
          </div>
        }
      >
        <div class="grid grid-cols-7 gap-2">
          <For each={weekDays()}>
            {day => <DayCell day={day} canSchedule={canScheduleDay(day)} onSelect={props.onDaySelect} />}
          </For>
        </div>
      </Show>

      <div class="mt-4 flex items-center gap-4 text-xs text-stone-500">
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

function DayCell(props: {
  day: DayInfo;
  compact?: boolean;
  canSchedule: boolean;
  onSelect: (iso: string, event: CalendarEventRow | undefined) => void;
}) {
  const isOccupied = () => props.day.inCurrentPeriod && Boolean(props.day.event);
  const isFree = () => props.day.inCurrentPeriod && !props.day.event && !props.day.isPast;

  return (
    <div
      classList={{
        "flex flex-col gap-1 rounded-lg border p-2 text-left": true,
        "min-h-[60px]": Boolean(props.compact),
        "min-h-[92px]": !props.compact,
        "border-black": props.day.isToday,
        "border-stone-200": !props.day.isToday && !isOccupied() && !isFree(),
        "border-blue-200": !props.day.isToday && isOccupied(),
        "border-green-200": !props.day.isToday && isFree(),
        "bg-blue-50": isOccupied(),
        "bg-green-50": isFree(),
        "opacity-40": !props.day.inCurrentPeriod,
      }}
    >
      <Show when={!props.compact}>
        <span class="text-xs text-stone-400">{props.day.weekday}</span>
      </Show>
      <span class="text-sm font-semibold text-stone-900">{props.day.dayNumber}</span>

      <Show when={props.day.event}>
        {event => {
          const meta = () => eventStatusMeta(event().status);
          return (
            <button
              type="button"
              onClick={() => props.onSelect(props.day.iso, event())}
              title={event().name}
              class={`w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium transition-opacity hover:opacity-80 ${meta().classes}`}
            >
              {event().start_time ? `${event().start_time!.slice(0, 5)} ` : ""}
              {event().name}
            </button>
          );
        }}
      </Show>

      <Show when={!props.day.event && props.canSchedule}>
        <button
          type="button"
          onClick={() => props.onSelect(props.day.iso, undefined)}
          class="text-left text-xs font-medium text-stone-500 underline decoration-dotted underline-offset-2 hover:cursor-pointer hover:text-black"
        >
          + Agregar
        </button>
      </Show>
    </div>
  );
}
