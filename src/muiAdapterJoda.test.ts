import { LocalDate, LocalDateTime } from '@js-joda/core';
import { Locale } from '@js-joda/locale';
// Side-effect import: registers en/en-US CLDR data with @js-joda/locale.
import '@js-joda/locale_en-us';
import { describe, expect, it } from 'vitest';
import { AdapterJsJoda } from './muiAdapterJoda.js';

const adapter = new AdapterJsJoda({ locale: Locale.US });

describe('AdapterJsJoda', () => {
  it('constructs with required locale', () => {
    expect(adapter.lib).toBe('js-joda');
    expect(adapter.isMUIAdapter).toBe(true);
    expect(adapter.isTimezoneCompatible).toBe(true);
  });

  it('throws if no locale is provided', () => {
    expect(
      // @ts-expect-error - testing the runtime guard
      () => new AdapterJsJoda({})
    ).toThrow(/adapterLocale/);
  });

  it('parses an ISO string into a LocalDateTime', () => {
    const result = adapter.date('2026-05-28T09:30:00');
    expect(result).toBeInstanceOf(LocalDateTime);
  });

  it('returns null when given null', () => {
    expect(adapter.date(null)).toBeNull();
  });

  it('formats a date using a format key', () => {
    const d = LocalDate.of(2026, 5, 28);
    expect(adapter.format(d, 'year')).toBe('2026');
    expect(adapter.format(d, 'month')).toBe('May');
    expect(adapter.format(d, 'monthShort')).toBe('May');
  });

  describe('arithmetic', () => {
    const base = LocalDate.of(2026, 1, 31);

    it('adds days', () => {
      expect(adapter.addDays(base, 1)).toEqual(LocalDate.of(2026, 2, 1));
    });

    it('adds months', () => {
      expect(adapter.addMonths(base, 1)).toEqual(LocalDate.of(2026, 2, 28));
    });

    it('adds years', () => {
      expect(adapter.addYears(base, 4)).toEqual(LocalDate.of(2030, 1, 31));
    });
  });

  describe('boundaries', () => {
    const d = LocalDate.of(2026, 5, 28);

    it('startOfMonth', () => {
      expect(adapter.startOfMonth(d)).toEqual(LocalDate.of(2026, 5, 1));
    });

    it('endOfMonth', () => {
      // `endOfMonth` of a `LocalDate` returns the LDT at the end of that day
      // (so `toJsDate` yields 23:59:59.999, not midnight). Compare via
      // `getDate` / `getMonth` rather than struct equality.
      const eom = adapter.endOfMonth(d);
      expect(adapter.getDate(eom)).toBe(31);
      expect(adapter.getMonth(eom)).toBe(4); // May, 0-indexed
    });

    it('startOfYear', () => {
      expect(adapter.startOfYear(d)).toEqual(LocalDate.of(2026, 1, 1));
    });
  });

  describe('comparisons', () => {
    const a = LocalDate.of(2026, 5, 28);
    const b = LocalDate.of(2026, 5, 28);
    const later = LocalDate.of(2026, 5, 29);

    it('isEqual for equal values', () => {
      expect(adapter.isEqual(a, b)).toBe(true);
    });

    it('isEqual for null/null', () => {
      expect(adapter.isEqual(null, null)).toBe(true);
    });

    it('isAfterDay', () => {
      expect(adapter.isAfterDay(later, a)).toBe(true);
      expect(adapter.isAfterDay(a, later)).toBe(false);
    });

    it('isSameMonth', () => {
      expect(adapter.isSameMonth(a, later)).toBe(true);
    });
  });

  it('builds a 7-column week grid for a month', () => {
    const weeks = adapter.getWeekArray(LocalDate.of(2026, 5, 15));
    expect(weeks.length).toBeGreaterThanOrEqual(4);
    for (const w of weeks) {
      expect(w).toHaveLength(7);
    }
  });
});
