/**
 * Vitest setup. Registers the `toEqualDateTime` custom matcher used throughout
 * the ported MUI X adapter test suite.
 *
 * Derived from MUI X's `test/utils/addChaiAssertions.ts`. The original is a
 * chai plugin; this is the equivalent vitest matcher.
 */
import { expect } from 'vitest';
import {
  convert,
  LocalDate,
  LocalDateTime,
  ZonedDateTime,
} from '@js-joda/core';

interface DateLike {
  toISOString?: () => string;
  toJSDate?: () => Date;
}

const toJSDate = (value: unknown): Date => {
  if (value instanceof Date) return value;
  if (typeof value === 'string') return new Date(value);
  // js-joda values: route through convert(), which uses the system zone for
  // LocalDate/LocalDateTime and the carried zone for ZonedDateTime.
  if (
    value instanceof LocalDate ||
    value instanceof LocalDateTime ||
    value instanceof ZonedDateTime
  ) {
    return convert(value).toDate();
  }
  const v = value as DateLike;
  if (typeof v?.toJSDate === 'function') return v.toJSDate();
  if (typeof v?.toISOString === 'function') return new Date(v.toISOString());
  throw new Error(
    `toEqualDateTime: cannot convert value to Date: ${String(value)}`,
  );
};

expect.extend({
  toEqualDateTime(received: unknown, expected: unknown) {
    let actualIso: string;
    let expectedIso: string;
    try {
      actualIso = toJSDate(received).toISOString();
      expectedIso = toJSDate(expected).toISOString();
    } catch (err) {
      return {
        pass: false,
        message: () =>
          `toEqualDateTime: ${(err as Error).message}\n` +
          `  received: ${String(received)}\n` +
          `  expected: ${String(expected)}`,
      };
    }
    const pass = actualIso === expectedIso;
    return {
      pass,
      message: () =>
        pass
          ? `Expected dates to differ, but both were ${actualIso}`
          : `Expected ${actualIso} to equal ${expectedIso}`,
    };
  },
});

interface CustomMatchers<R = unknown> {
  toEqualDateTime(expected: unknown): R;
}

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion<T = any> extends CustomMatchers<T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
