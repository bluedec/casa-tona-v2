export type EventStatus = "reservado" | "confirmado" | "en_curso" | "finalizado" | "cancelado";

export const EVENT_STATUSES: { value: EventStatus; label: string; classes: string }[] = [
  { value: "reservado", label: "Reservado", classes: "bg-stone-100 text-stone-700 border border-stone-300" },
  { value: "confirmado", label: "Confirmado", classes: "bg-stone-800 text-white" },
  { value: "en_curso", label: "En curso", classes: "bg-black text-white" },
  { value: "finalizado", label: "Finalizado", classes: "bg-white text-stone-400 border border-stone-200" },
  { value: "cancelado", label: "Cancelado", classes: "bg-white text-stone-300 border border-stone-200 line-through" },
];

export function eventStatusMeta(status: string) {
  return EVENT_STATUSES.find(s => s.value === status) ?? EVENT_STATUSES[0];
}
