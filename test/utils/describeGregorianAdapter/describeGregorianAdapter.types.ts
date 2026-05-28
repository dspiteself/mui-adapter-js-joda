/**
 * Ported from MUI X `test/utils/pickers/describeGregorianAdapter` (MIT).
 *
 * Added `defaultLocale`: js-joda has no implicit default locale, so we make
 * the test runner pass one explicitly rather than rely on `new Adapter()`
 * with no args (which our adapter rejects).
 */
import type {
  MuiPickersAdapter,
  PickersTimezone,
  PickerValidDate,
} from '@mui/x-date-pickers/models';

export interface DescribeGregorianAdapterParams<TLocale> {
  prepareAdapter?: (adapter: MuiPickersAdapter<TLocale>) => void;
  formatDateTime: string;
  getLocaleFromDate?: (value: PickerValidDate) => string;
  dateLibInstanceWithTimezoneSupport?: any;
  setDefaultTimezone: (timezone: PickersTimezone | undefined) => void;
  /**
   * The locale used for the "default" adapter. Required for adapters whose
   * constructor demands an explicit locale (js-joda).
   */
  defaultLocale: TLocale;
  /**
   * The French locale, used to verify locale-independent equality and the
   * locale-of-the-adapter-vs-the-date contract.
   */
  frenchLocale: TLocale;
}

export interface DescribeGregorianAdapterTestSuiteParams<TLocale>
  extends Omit<
    DescribeGregorianAdapterParams<TLocale>,
    'frenchLocale' | 'defaultLocale'
  > {
  adapter: MuiPickersAdapter<TLocale>;
  adapterTZ: MuiPickersAdapter<TLocale>;
  adapterFr: MuiPickersAdapter<TLocale>;
}

export type DescribeGregorianAdapterTestSuite = <TLocale>(
  params: DescribeGregorianAdapterTestSuiteParams<TLocale>,
) => void;
