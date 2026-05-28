/**
 * Runs the ported MUI X `describeGregorianAdapter` suite against
 * `AdapterJsJoda`. The suite is the same one MUI X uses for built-in
 * adapters (Dayjs, Luxon, date-fns, Moment).
 */
import { describe } from 'vitest';
import { Locale } from '@js-joda/locale';
// Side-effect imports: register CLDR data with @js-joda/locale.
import '@js-joda/locale_en-us';
import '@js-joda/locale_fr';
// Side-effect import: registers IANA tzdb with @js-joda/core.
import '@js-joda/timezone';
import { describeGregorianAdapter } from '../test/utils/describeGregorianAdapter/index.js';
import { AdapterJsJoda, setDefaultTimezone } from './muiAdapterJoda.js';

describe('<AdapterJsJoda />', () => {
  describeGregorianAdapter(AdapterJsJoda, {
    formatDateTime: 'yyyy-MM-dd HH:mm:ss',
    setDefaultTimezone,
    defaultLocale: Locale.US,
    frenchLocale: Locale.FRANCE,
  });
});
