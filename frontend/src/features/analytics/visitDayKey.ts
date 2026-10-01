/** UTC-Kalendertag `YYYY-MM-DD`. */
export function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
