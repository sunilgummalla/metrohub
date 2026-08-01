import { describe, it, expect } from "vitest";
import {
  calendarDaysInclusive,
  rangesOverlap,
  expandBookedDays,
} from "./routers/slotDates";

// Use local-time constructors (year, monthIndex, day) throughout so the tests
// match the server's local calendar-day math regardless of the runner's TZ.
const d = (y: number, m: number, day: number, h = 0) => new Date(y, m - 1, day, h);

describe("calendarDaysInclusive", () => {
  it("counts a same-day booking as 1 day", () => {
    expect(calendarDaysInclusive(d(2026, 8, 10), d(2026, 8, 10))).toBe(1);
  });

  it("counts inclusive end dates (Aug 1–3 = 3 days)", () => {
    expect(calendarDaysInclusive(d(2026, 8, 1), d(2026, 8, 3))).toBe(3);
  });

  it("ignores the time-of-day component", () => {
    expect(calendarDaysInclusive(d(2026, 8, 1, 23), d(2026, 8, 2, 1))).toBe(2);
  });

  it("spans month boundaries", () => {
    // Jul 30, Jul 31, Aug 1 = 3 days
    expect(calendarDaysInclusive(d(2026, 7, 30), d(2026, 8, 1))).toBe(3);
  });
});

describe("rangesOverlap", () => {
  it("detects a fully-contained overlap", () => {
    expect(rangesOverlap(d(2026, 8, 5), d(2026, 8, 10), d(2026, 8, 6), d(2026, 8, 7))).toBe(true);
  });

  it("treats touching endpoints as an overlap (inclusive)", () => {
    // existing ends Aug 5, new starts Aug 5 → same day is taken
    expect(rangesOverlap(d(2026, 8, 1), d(2026, 8, 5), d(2026, 8, 5), d(2026, 8, 9))).toBe(true);
  });

  it("returns false for disjoint ranges", () => {
    expect(rangesOverlap(d(2026, 8, 1), d(2026, 8, 4), d(2026, 8, 5), d(2026, 8, 9))).toBe(false);
  });

  it("is symmetric", () => {
    const a1 = d(2026, 8, 3), a2 = d(2026, 8, 8);
    const b1 = d(2026, 8, 7), b2 = d(2026, 8, 12);
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(rangesOverlap(b1, b2, a1, a2));
  });
});

describe("expandBookedDays", () => {
  it("marks every inclusive day a booking covers within the month", () => {
    const days = expandBookedDays([{ startDate: d(2026, 8, 10), endDate: d(2026, 8, 12) }], 2026, 8);
    expect(days).toEqual([10, 11, 12]);
  });

  it("clips a booking that starts before the requested month", () => {
    // Jul 30 → Aug 2, asking about August → only 1 and 2
    const days = expandBookedDays([{ startDate: d(2026, 7, 30), endDate: d(2026, 8, 2) }], 2026, 8);
    expect(days).toEqual([1, 2]);
  });

  it("clips a booking that ends after the requested month", () => {
    // Aug 30 → Sep 2, asking about August → only 30 and 31
    const days = expandBookedDays([{ startDate: d(2026, 8, 30), endDate: d(2026, 9, 2) }], 2026, 8);
    expect(days).toEqual([30, 31]);
  });

  it("merges/dedupes overlapping bookings and returns sorted unique days", () => {
    const days = expandBookedDays(
      [
        { startDate: d(2026, 8, 5), endDate: d(2026, 8, 7) },
        { startDate: d(2026, 8, 6), endDate: d(2026, 8, 9) },
      ],
      2026,
      8
    );
    expect(days).toEqual([5, 6, 7, 8, 9]);
  });

  it("skips reversed/invalid ranges", () => {
    const days = expandBookedDays([{ startDate: d(2026, 8, 10), endDate: d(2026, 8, 8) }], 2026, 8);
    expect(days).toEqual([]);
  });

  it("accepts ISO date strings as well as Date objects", () => {
    const days = expandBookedDays(
      [{ startDate: "2026-08-15T00:00:00", endDate: "2026-08-16T00:00:00" }],
      2026,
      8
    );
    expect(days).toEqual([15, 16]);
  });
});
