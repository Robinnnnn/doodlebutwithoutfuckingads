export const DEFAULT_OPTION_HOUR = 18;

export type CalendarDay = {
  date: Date;
  key: string;
  inCurrentMonth: boolean;
};

export function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localDateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

export function monthKeyForDate(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1, 12);
  return localDateKey(first);
}

export function shiftMonth(monthKey: string, amount: number) {
  const month = localDateFromKey(monthKey);
  return monthKeyForDate(
    new Date(month.getFullYear(), month.getMonth() + amount, 1, 12),
  );
}

export function calendarDays(monthKey: string): CalendarDay[] {
  const month = localDateFromKey(monthKey);
  const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      key: localDateKey(date),
      inCurrentMonth: date.getMonth() === first.getMonth(),
    };
  });
}

export function optionAtDefaultTime(
  dateKey: string,
  allDay = false,
) {
  return `${dateKey}T${allDay ? "00:00" : `${DEFAULT_OPTION_HOUR}:00`}`;
}
