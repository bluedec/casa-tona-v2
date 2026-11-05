/** Format a Date as a local yyyy-mm-dd string (no UTC shift, unlike toISOString). */
export function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayIsoDate(): string {
  return toLocalIsoDate(new Date());
}

const MONTH_NAMES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabelEs(year: number, month: number): string {
  return `${MONTH_NAMES_ES[month]} ${year}`;
}

export function formatDateEs(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} de ${MONTH_NAMES_ES[month - 1]} de ${year}`;
}

const WEEKDAY_NAMES_ES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function weekdayLabelEs(weekday: number): string {
  return WEEKDAY_NAMES_ES[weekday];
}

export function shortDayLabelEs(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES_ES[d.getMonth()].slice(0, 3)}`;
}

export function startOfWeek(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}
