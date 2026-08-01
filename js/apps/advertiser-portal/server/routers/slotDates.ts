/**
 * Pure date helpers for slot booking — extracted so the business-critical
 * calendar-day pricing, month-overlap expansion, and range-overlap logic can be
 * unit-tested independently of the database/tRPC layer.
 *
 * All calculations use local calendar days (matching the booking date inputs),
 * never raw UTC timestamps, so pricing and availability stay consistent.
 */

/** Local midnight for a date (drops the time component). */
function startOfLocalDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Number of calendar days a [start, end] booking spans, inclusive of both ends.
 * Same day → 1. This is what a booking is billed for, and it matches how
 * `expandBookedDays` marks the availability calendar.
 */
export function calendarDaysInclusive(start: Date, end: Date): number {
  return Math.round((startOfLocalDay(end) - startOfLocalDay(start)) / 86_400_000) + 1;
}

/** True when the [start, end] ranges overlap on any calendar day (ends inclusive). */
export function rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart.getTime() <= bEnd.getTime() && aEnd.getTime() >= bStart.getTime();
}

export interface DateRangeLike {
  startDate: Date | string;
  endDate: Date | string;
}

/**
 * Given bookings that overlap a month, return the sorted day-of-month numbers
 * they occupy. Ranges are clipped to the month, so a booking spanning a month
 * boundary only contributes the days that fall inside [year, month].
 */
export function expandBookedDays(
  bookings: DateRangeLike[],
  year: number,
  month: number
): number[] {
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

  const days = new Set<number>();
  for (const booking of bookings) {
    const bStart = new Date(booking.startDate);
    const bEnd = new Date(booking.endDate);
    // Ignore reversed/invalid ranges defensively.
    if (bEnd.getTime() < bStart.getTime()) continue;

    const rangeStart = bStart > monthStart ? bStart : monthStart;
    const rangeEnd = bEnd < monthEnd ? bEnd : monthEnd;
    if (rangeEnd < rangeStart) continue;

    const cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate());
    while (cursor <= rangeEnd) {
      if (cursor.getMonth() === month - 1 && cursor.getFullYear() === year) {
        days.add(cursor.getDate());
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return Array.from(days).sort((a, b) => a - b);
}
