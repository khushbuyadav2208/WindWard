export const number = (value: number | null | undefined, digits = 0) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: digits,
        minimumFractionDigits: digits,
      }).format(value);
export const signed = (value: number | null | undefined, digits = 0) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${number(value, digits)}`;
export const date = (
  value: string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
) =>
  value == null
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        day: "2-digit",
        month: "short",
        ...options,
      }).format(new Date(value));
export const datetime = (value: string | null | undefined) =>
  date(value, { hour: "2-digit", minute: "2-digit" });
export const time = (value: string | null | undefined) =>
  value == null
    ? "—"
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/London",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(value));
