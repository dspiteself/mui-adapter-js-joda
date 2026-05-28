/**
 * @file
 * MUI-X adapter for js-joda.
 *
 * Based in part on @date-io/js-joda, which is
 *
 * Copyright (c) 2017 Dmitriy Kovalenko
 *
 * and used under the terms of the MIT license.
 */
import {
  ChronoField,
  ChronoUnit,
  convert,
  DateTimeFormatter,
  DayOfWeek,
  Instant,
  LocalDate,
  LocalDateTime,
  LocalTime,
  TemporalAdjusters,
  Year,
  ZonedDateTime,
  ZoneId,
  ZoneOffset,
} from '@js-joda/core';
import type { Locale } from '@js-joda/locale';
import type {
  AdapterFormats,
  AdapterOptions,
  DateBuilderReturnType,
  FieldFormatTokenMap,
  MuiPickersAdapter,
  PickersTimezone,
} from '@mui/x-date-pickers/models';

declare module '@mui/x-date-pickers/models' {
  export interface PickerValidDateLookup {
    'js-joda': CalendarType;
  }
}

export type CalendarType = LocalDateTime | LocalDate | ZonedDateTime;

/**
 * Markers stamped on js-joda values to preserve adapter-level state that the
 * underlying object can't carry:
 *
 *  - `SYSTEM_TZ` — the value was constructed with the literal `'system'`
 *    timezone string and `getTimezone` should round-trip that string rather
 *    than the resolved IANA name. Lost on any arithmetic.
 *  - `INVALID`   — the value is a sentinel returned by `getInvalidDate()` or
 *    by `date()` after a parse failure. `isValid` checks for it.
 */
const SYSTEM_TZ = Symbol.for('mui-adapter-js-joda.systemTz');
const INVALID = Symbol.for('mui-adapter-js-joda.invalid');

const mark = <T extends object>(value: T, marker: symbol): T => {
  Object.defineProperty(value, marker, { value: true, configurable: true });
  return value;
};

const hasMark = (value: unknown, marker: symbol): boolean =>
  typeof value === 'object' && value !== null && (value as any)[marker] === true;

/**
 * Module-level default zone, used when the adapter is asked for the `'default'`
 * timezone. Falls back to `ZoneId.SYSTEM` when unset. Set with
 * {@link setDefaultTimezone}. Mirrors the behavior of MUI X's other adapters
 * (Dayjs/Luxon/etc.) where the underlying date lib exposes a global default.
 */
let defaultZone: ZoneId | null = null;

/**
 * Override the zone used for `'default'` timezone resolution. Pass `undefined`
 * to fall back to {@link ZoneId.SYSTEM}.
 */
export const setDefaultTimezone = (
  timezone: PickersTimezone | undefined,
): void => {
  if (timezone === undefined || timezone === 'system') {
    defaultZone = null;
    return;
  }
  defaultZone = timezone === 'default' ? defaultZone : ZoneId.of(timezone);
};

const defaultFormats: AdapterFormats = {
  dayOfMonth: 'd',
  dayOfMonthFull: 'd', // e.g., "9th" - not supported by js-joda
  fullDate: 'MMM d, yyyy',
  fullTime12h: 'hh:mm a',
  fullTime24h: 'HH:mm',
  hours12h: 'hh',
  hours24h: 'HH',
  meridiem: 'a',
  keyboardDate: 'MM/dd/yyyy',
  keyboardDateTime12h: 'MM/dd/yyyy hh:mm a',
  keyboardDateTime24h: 'MM/dd/yyyy HH:mm',
  minutes: 'mm',
  month: 'MMMM',
  monthShort: 'MMM',
  weekday: 'EEEE',
  weekdayShort: 'EEE',
  normalDate: 'd MMMM',
  normalDateWithWeekday: 'EEE, MMM d',
  seconds: 'ss',
  shortDate: 'MMM d',
  year: 'yyyy',
};

// See https://js-joda.github.io/js-joda/manual/formatting.html
// and https://docs.oracle.com/javase/7/docs/api/java/text/SimpleDateFormat.html
const formatTokenMap: FieldFormatTokenMap = {
  // Year
  y: 'year',
  yy: 'year',
  yyyy: 'year',

  // Month
  M: 'month',
  MM: 'month',
  MMM: { sectionType: 'month', contentType: 'letter' },
  MMMM: { sectionType: 'month', contentType: 'letter' },

  // Day of the month
  d: 'day',
  dd: 'day',

  // Day of the week
  u: 'weekDay',
  E: { sectionType: 'weekDay', contentType: 'letter' },
  EEEE: { sectionType: 'weekDay', contentType: 'letter' },

  // Meridiem
  A: 'meridiem',
  a: 'meridiem',

  // Hours
  H: 'hours',
  HH: 'hours',
  h: 'hours',
  hh: 'hours',
  k: 'hours',
  kk: 'hours',

  // Minutes
  m: 'minutes',
  mm: 'minutes',

  // Seconds
  s: 'seconds',
  ss: 'seconds',
};

/**
 * Adds js-joda support to MUI-X:
 *
 * - https://github.com/mui/mui-x/pull/8438
 * - https://github.com/mui/mui-x/issues/6470
 * - https://github.com/mui/mui-x/issues/4703
 * - https://github.com/dmtrKovalenko/date-io/pull/634
 */
export class AdapterJsJoda implements MuiPickersAdapter<Locale> {
  public isMUIAdapter = true;

  public isTimezoneCompatible = true;

  public lib = 'js-joda';

  public locale?: Locale;

  public formats: AdapterFormats;

  public escapedCharacters = { start: '[', end: ']' };

  public formatTokenMap = formatTokenMap;

  constructor({
    locale,
    formats,
  }: AdapterOptions<Locale, never> & { locale: Locale }) {
    if (!locale) {
      // E.g., Locale.ENGLISH from @js-joda/locale_en-us.
      throw new Error('adapterLocale is required for AdapterJsJoda');
    }
    this.locale = locale;
    this.formats = { ...defaultFormats, ...formats };
  }

  private formatter = (formatString: string) => {
    let formatter = DateTimeFormatter.ofPattern(formatString);
    if (this.locale) {
      formatter = formatter.withLocale(this.locale);
    }
    return formatter;
  };

  private zone = (timezone: PickersTimezone): ZoneId => {
    if (timezone === 'system') return ZoneId.SYSTEM;
    if (timezone === 'default') return defaultZone ?? ZoneId.SYSTEM;
    return ZoneId.of(timezone);
  };

  // Manipulating time on a local date may indicate, e.g., using a DatePicker to
  // change the date portion without affecting the selected time.  On a
  // LocalDate, that's a noop.
  private getTime = (value: CalendarType, field: ChronoField): number =>
    value instanceof LocalDate ? 0 : value.get(field);
  private setTime = (
    value: CalendarType,
    field: ChronoField,
    amount: number
  ): CalendarType =>
    value instanceof LocalDate ? value : value.with(field, amount);

  public date = <T extends string | null | undefined>(
    value?: T,
    timezone?: PickersTimezone
  ): DateBuilderReturnType<T> => {
    type R = DateBuilderReturnType<T>;
    if (value === null) {
      return null as R;
    }

    const isSystemRequested = timezone === 'system';
    const zoneRequested = timezone ? this.zone(timezone) : null;
    const tag = (v: CalendarType): CalendarType =>
      isSystemRequested ? mark(v as object, SYSTEM_TZ) as CalendarType : v;

    // No value → "now" in the requested zone, or system-zoned LocalDateTime.
    if (value === undefined) {
      if (zoneRequested) {
        return tag(ZonedDateTime.now(zoneRequested)) as R;
      }
      return LocalDateTime.now() as R;
    }

    try {
      // ISO strings carrying a zone designator (`Z` or `±HH:MM`) must be
      // parsed as an Instant — `LocalDateTime.parse` rejects the suffix.
      const hasZoneInfo = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
      const isDateOnly = !value.includes('T');

      if (zoneRequested) {
        let zdt: ZonedDateTime;
        if (hasZoneInfo) {
          zdt = Instant.parse(value).atZone(zoneRequested);
        } else if (isDateOnly) {
          zdt = LocalDate.parse(value).atStartOfDay(zoneRequested);
        } else {
          zdt = LocalDateTime.parse(value).atZone(zoneRequested);
        }
        return tag(zdt) as R;
      }

      if (hasZoneInfo) {
        // Convert to a LocalDateTime in the system zone so toJsDate
        // round-trips the original instant (assuming the system zone is
        // what the caller expected when omitting `timezone`).
        return Instant.parse(value)
          .atZone(ZoneId.SYSTEM)
          .toLocalDateTime() as R;
      }
      if (isDateOnly) {
        return LocalDate.parse(value) as R;
      }
      return LocalDateTime.parse(value) as R;
    } catch {
      // MUI X expects `date('garbage')` to return an "invalid" value that
      // `isValid` later detects, not to throw.
      return this.getInvalidDate() as R;
    }
  };

  public getInvalidDate = (): CalendarType =>
    // Construct a fresh LDT each call — marking `LocalDateTime.MIN` (a
    // singleton) would taint every reference to it across the program.
    mark(LocalDateTime.of(1970, 1, 1, 0, 0, 0, 0) as object, INVALID) as CalendarType;

  public getTimezone = (value: CalendarType | null): string => {
    if (value === null) return 'system';
    if (hasMark(value, SYSTEM_TZ)) return 'system';
    return value instanceof ZonedDateTime ? value.zone().id() : 'system';
  };

  public setTimezone = (
    value: CalendarType,
    timezone: PickersTimezone
  ): CalendarType => {
    if (value instanceof LocalDate) return value;
    const z = this.zone(timezone);
    let zdt: ZonedDateTime;
    if (value instanceof ZonedDateTime) {
      // ZDT → ZDT: preserve the instant; let the wall-clock shift to match
      // the new zone. This matches the contract of MUI X's other adapters
      // (Dayjs `.tz()`, Luxon `.setZone()`).
      zdt = value.withZoneSameInstant(z);
    } else {
      // LDT → ZDT (first-time zone assignment): keep the wall-clock and label
      // it as belonging to the target zone. There's no prior instant to
      // preserve.
      zdt = ZonedDateTime.of(value as LocalDateTime, z);
    }
    return timezone === 'system' ? (mark(zdt as object, SYSTEM_TZ) as CalendarType) : zdt;
  };
  public toJsDate = (value: CalendarType): Date => convert(value).toDate();
  public parse = (value: string, format: string): CalendarType | null => {
    try {
      const accessor = this.formatter(format).parse(value);
      return accessor.isSupported(ChronoField.HOUR_OF_DAY) &&
        accessor.isSupported(ChronoField.MINUTE_OF_HOUR) &&
        accessor.isSupported(ChronoField.SECOND_OF_MINUTE)
        ? LocalDateTime.from(accessor)
        : LocalDate.from(accessor);
    } catch (ex) {
      return null;
    }
  };
  public getCurrentLocaleCode = (): string =>
    this.locale?.toString() ?? 'en-US'; // TODO - test; what's the default?
  public is12HourCycleInCurrentLocale = (): boolean => true; // TODO - unimplemented
  public expandFormat = (format: string): string => format;
  public isValid = (value: CalendarType | null): value is CalendarType =>
    !!value && !hasMark(value, INVALID);
  public format = (
    value: CalendarType,
    formatKey: keyof AdapterFormats
  ): string => this.formatByString(value, this.formats[formatKey]);
  public formatByString = (value: CalendarType, formatString: string): string =>
    this.formatter(formatString).format(value);
  public formatNumber = (numberToFormat: string): string => numberToFormat;

  /**
   * Reduce a value to a `LocalDateTime` so cross-type comparisons don't throw
   * (js-joda is strict about comparing only same-typed temporals).
   */
  private toLocalDateTime = (value: CalendarType): LocalDateTime => {
    if (value instanceof LocalDate) return value.atStartOfDay();
    if (value instanceof ZonedDateTime) return value.toLocalDateTime();
    return value;
  };

  /**
   * Get the `Instant` (UTC-anchored timestamp) for a value. Unzoned values
   * (`LocalDate`, `LocalDateTime`) are anchored at UTC for the purpose of
   * comparison — picks a fixed reference frame so cross-type ordering is
   * well-defined.
   */
  private toInstant = (value: CalendarType): Instant => {
    if (value instanceof ZonedDateTime) return value.toInstant();
    if (value instanceof LocalDate) {
      return value.atStartOfDay(ZoneOffset.UTC).toInstant();
    }
    return value.atZone(ZoneOffset.UTC).toInstant();
  };

  /**
   * - `equals` follows MUI X's "wall-clock equivalence" contract: two ZDTs at
   *   the same wall-clock time in different zones are considered equal.
   * - `isAfter` / `isBefore` follow chronological order: when any side is a
   *   ZDT, compare instants; otherwise compare wall-clock LDT (UTC-anchored
   *   for ordering between LDT and LocalDate).
   */
  private compareWithCoerce = (
    value: CalendarType,
    comparing: CalendarType,
    op: 'equals' | 'isAfter' | 'isBefore'
  ): boolean => {
    if (op === 'equals') {
      return this.toLocalDateTime(value).equals(this.toLocalDateTime(comparing));
    }
    if (value instanceof ZonedDateTime || comparing instanceof ZonedDateTime) {
      return this.toInstant(value)[op](this.toInstant(comparing));
    }
    return this.toLocalDateTime(value)[op](this.toLocalDateTime(comparing));
  };

  public isEqual = (
    value: CalendarType | null,
    comparing: CalendarType | null
  ): boolean =>
    (value === null && comparing === null) ||
    (!!value &&
      !!comparing &&
      this.compareWithCoerce(value, comparing, 'equals'));
  // The `isSame*` family buckets by UTC calendar fields so timezone-rotated
  // copies of the same instant report as the same bucket. This matches MUI X's
  // contract that, e.g., `isSameDay(Z_London_endOfDay, Z_Paris_sameInstant)`
  // is `true`.
  private utcOf = (v: CalendarType) => this.toInstant(v).atOffset(ZoneOffset.UTC);

  public isSameYear = (value: CalendarType, comparing: CalendarType): boolean =>
    this.utcOf(value).year() === this.utcOf(comparing).year();
  public isSameMonth = (
    value: CalendarType,
    comparing: CalendarType
  ): boolean => {
    const a = this.utcOf(value);
    const b = this.utcOf(comparing);
    return a.year() === b.year() && a.monthValue() === b.monthValue();
  };
  public isSameDay = (value: CalendarType, comparing: CalendarType): boolean =>
    this.utcOf(value).toLocalDate().equals(this.utcOf(comparing).toLocalDate());
  // Two pure `LocalDate`s have no clock time, so we treat them as equal-by-hour
  // iff they're the same day. Otherwise compare instants truncated to the hour.
  public isSameHour = (value: CalendarType, comparing: CalendarType): boolean => {
    if (value instanceof LocalDate && comparing instanceof LocalDate) {
      return value.equals(comparing);
    }
    if (value instanceof LocalDate || comparing instanceof LocalDate) {
      return false;
    }
    return this.toInstant(value)
      .truncatedTo(ChronoUnit.HOURS)
      .equals(this.toInstant(comparing).truncatedTo(ChronoUnit.HOURS));
  };

  public isAfter = (value: CalendarType, comparing: CalendarType): boolean =>
    this.compareWithCoerce(value, comparing, 'isAfter');
  public isAfterYear = (
    value: CalendarType,
    comparing: CalendarType
  ): boolean => this.utcOf(value).year() > this.utcOf(comparing).year();
  // Compare local-dates in `value`'s frame: if `value` is zoned, rebase
  // `comparing`'s instant into that zone before extracting its date. This
  // matches MUI X's contract for day comparisons, which is intentionally
  // asymmetric — `isAfterDay(a, b)` may differ from `!isBeforeDay(b, a)` when
  // the two sides have shifted day boundaries.
  public isAfterDay = (value: CalendarType, comparing: CalendarType): boolean =>
    this.dayIn(value, value).isAfter(this.dayIn(comparing, value));
  public isBefore = (value: CalendarType, comparing: CalendarType): boolean =>
    this.compareWithCoerce(value, comparing, 'isBefore');
  public isBeforeYear = (
    value: CalendarType,
    comparing: CalendarType
  ): boolean => this.utcOf(value).year() < this.utcOf(comparing).year();
  public isBeforeDay = (
    value: CalendarType,
    comparing: CalendarType
  ): boolean =>
    this.dayIn(value, value).isBefore(this.dayIn(comparing, value));

  /**
   * Date portion of `target`'s instant when viewed from `frame`'s zone (or UTC
   * if `frame` is unzoned). Used by {@link isAfterDay} / {@link isBeforeDay}.
   */
  private dayIn = (target: CalendarType, frame: CalendarType): LocalDate => {
    const zone =
      frame instanceof ZonedDateTime ? frame.zone() : ZoneOffset.UTC;
    return this.toInstant(target).atZone(zone).toLocalDate();
  };
  public isWithinRange = (
    value: CalendarType,
    range: [CalendarType, CalendarType]
  ): boolean =>
    !this.isBefore(value, range[0]) && !this.isAfter(value, range[1]);

  public startOfYear = (value: CalendarType): CalendarType =>
    this.startOfDay(value).with(ChronoField.DAY_OF_YEAR, 1);
  public startOfMonth = (value: CalendarType): CalendarType =>
    this.startOfDay(value.with(ChronoField.DAY_OF_MONTH, 1));
  public startOfDay = (value: CalendarType): CalendarType =>
    value instanceof LocalDate ? value : value.with(ChronoField.NANO_OF_DAY, 0);
  public endOfYear = (value: CalendarType): CalendarType =>
    this.endOfDay(value.with(TemporalAdjusters.lastDayOfYear()));
  public endOfMonth = (value: CalendarType): CalendarType =>
    this.endOfDay(value.with(TemporalAdjusters.lastDayOfMonth()));
  // For a `LocalDate`, return the LDT at 23:59:59.999_999_999 so callers (and
  // the tests) get an instant near end-of-day rather than the date's implicit
  // midnight. For LDT/ZDT, set the wall-clock to `LocalTime.MAX`.
  public endOfDay = (value: CalendarType): CalendarType =>
    value instanceof LocalDate
      ? value.atTime(LocalTime.MAX)
      : value.with(LocalTime.MAX);

  // js-joda defaults to ISO week fields (ending on Sunday).  We want to instead
  // start on Sunday.
  public startOfWeek = (value: CalendarType): CalendarType =>
    this.startOfDay(
      value.with(TemporalAdjusters.previousOrSame(DayOfWeek.SUNDAY))
    );
  public endOfWeek = (value: CalendarType): CalendarType =>
    this.endOfDay(
      value
        .with(TemporalAdjusters.next(DayOfWeek.SUNDAY))
        .minus(1, ChronoUnit.DAYS)
    );

  public addYears = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.YEARS);
  public addMonths = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.MONTHS);
  public addWeeks = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.WEEKS);
  public addDays = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.DAYS);
  public addHours = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.HOURS);
  public addMinutes = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.MINUTES);
  public addSeconds = (value: CalendarType, amount: number): CalendarType =>
    value.plus(amount, ChronoUnit.SECONDS);

  public getYear = (value: CalendarType): number => value.get(ChronoField.YEAR);
  // MUI X uses JS-Date semantics for month (0 = January, 11 = December);
  // js-joda's `MONTH_OF_YEAR` is 1-indexed, so adapt at the boundary.
  public getMonth = (value: CalendarType): number =>
    value.get(ChronoField.MONTH_OF_YEAR) - 1;
  public getDate = (value: CalendarType): number =>
    value.get(ChronoField.DAY_OF_MONTH);

  public getHours = (value: CalendarType): number =>
    this.getTime(value, ChronoField.HOUR_OF_DAY);
  public getMinutes = (value: CalendarType): number =>
    this.getTime(value, ChronoField.MINUTE_OF_HOUR);
  public getSeconds = (value: CalendarType): number =>
    this.getTime(value, ChronoField.SECOND_OF_MINUTE);
  public getMilliseconds = (value: CalendarType): number =>
    this.getTime(value, ChronoField.MILLI_OF_SECOND);

  public setYear = (value: CalendarType, year: number): CalendarType =>
    value.with(ChronoField.YEAR, year);
  // Counterpart to {@link getMonth}: callers pass a 0-indexed month.
  public setMonth = (value: CalendarType, month: number): CalendarType =>
    value.with(ChronoField.MONTH_OF_YEAR, month + 1);
  public setDate = (value: CalendarType, date: number): CalendarType =>
    value.with(ChronoField.DAY_OF_MONTH, date);

  public setHours = (value: CalendarType, hours: number): CalendarType =>
    this.setTime(value, ChronoField.HOUR_OF_DAY, hours);
  public setMinutes = (value: CalendarType, minutes: number): CalendarType =>
    this.setTime(value, ChronoField.MINUTE_OF_HOUR, minutes);
  public setSeconds = (value: CalendarType, seconds: number) =>
    this.setTime(value, ChronoField.SECOND_OF_MINUTE, seconds);
  public setMilliseconds = (value: CalendarType, milliseconds: number) =>
    this.setTime(value, ChronoField.MILLI_OF_SECOND, milliseconds);

  public getDaysInMonth = (value: CalendarType): number =>
    value.range(ChronoField.DAY_OF_MONTH).maximum();
  public getWeekArray = (value: CalendarType): CalendarType[][] => {
    // Iterate in LocalDate space (clean & type-stable), then project each cell
    // back to the input's CalendarType so callers can introspect timezone,
    // hour, etc. on the cells (the DST suite checks this).
    const baseDate = value instanceof LocalDate ? value : LocalDate.from(value);
    const startLocalDate = LocalDate.from(
      this.startOfWeek(this.startOfMonth(baseDate)),
    );
    const endLocalDate = LocalDate.from(
      this.endOfWeek(this.endOfMonth(baseDate)),
    );

    const project = (date: LocalDate): CalendarType => {
      if (value instanceof LocalDate) return date;
      if (value instanceof ZonedDateTime) return date.atStartOfDay(value.zone());
      return date.atStartOfDay();
    };

    const nestedWeeks: CalendarType[][] = [];
    let current = startLocalDate;
    let count = 0;
    while (!current.isAfter(endLocalDate)) {
      const weekNumber = Math.floor(count / 7);
      nestedWeeks[weekNumber] ||= [];
      nestedWeeks[weekNumber]!.push(project(current));
      current = current.plusDays(1);
      count++;
    }
    return nestedWeeks;
  };
  // js-joda defaults to ISO week fields (ending on Sunday).  We want to instead
  // start on Sunday, without incurring a dependency on js-joda's
  // locale-specific WeekFields.SUNDAY_START.
  public getWeekNumber = (value: CalendarType): number => {
    const alignedWeekNumber = value.get(ChronoField.ALIGNED_WEEK_OF_YEAR);
    const dayOfWeek = this.getDayOfWeek(value);
    const firstDayOfWeekOfYear = this.getDayOfWeek(
      value.with(ChronoField.DAY_OF_YEAR, 1)
    );
    return dayOfWeek < firstDayOfWeekOfYear
      ? alignedWeekNumber + 1
      : alignedWeekNumber;
  };
  public getDayOfWeek = (value: CalendarType): number =>
    (value.get(ChronoField.DAY_OF_WEEK) % 7) + 1;
  public getYearRange = (
    range: [CalendarType, CalendarType]
  ): CalendarType[] => {
    const years: LocalDate[] = [];
    let startYear = Year.from(range[0]);
    const endYear = Year.from(range[1]);
    while (!startYear.isAfter(endYear)) {
      years.push(startYear.atDay(1));
      startYear = startYear.plusYears(1);
    }
    return years;
  };
}

