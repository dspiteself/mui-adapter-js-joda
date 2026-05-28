/**
 * Ported from MUI X `test/utils/pickers/describeGregorianAdapter` (MIT).
 *
 * Differences from upstream:
 *  - Uses our local `createDescribe` stub instead of
 *    `@mui/internal-test-utils/createDescribe`.
 *  - Threads `defaultLocale` through to `new Adapter({ locale })` so adapters
 *    that require an explicit locale (js-joda) can run the suite.
 */
import { describe } from 'vitest';
import type { MuiPickersAdapter } from '@mui/x-date-pickers/models';
import { createDescribe } from '../createDescribe.js';
import { testCalculations } from './testCalculations.js';
import { testLocalization } from './testLocalization.js';
import { testFormat } from './testFormat.js';
import type {
  DescribeGregorianAdapterParams,
  DescribeGregorianAdapterTestSuiteParams,
} from './describeGregorianAdapter.types.js';

function innerGregorianDescribeAdapter<TLocale>(
  Adapter: new (...args: any) => MuiPickersAdapter<TLocale>,
  params: DescribeGregorianAdapterParams<TLocale>,
) {
  const prepareAdapter = params.prepareAdapter ?? (() => {});

  const adapter = new Adapter({ locale: params.defaultLocale });
  const adapterTZ = params.dateLibInstanceWithTimezoneSupport
    ? new Adapter({
        locale: params.defaultLocale,
        dateLibInstance: params.dateLibInstanceWithTimezoneSupport,
      })
    : new Adapter({ locale: params.defaultLocale });
  const adapterFr = new Adapter({
    locale: params.frenchLocale,
    dateLibInstance: params.dateLibInstanceWithTimezoneSupport,
  });

  prepareAdapter(adapter);
  prepareAdapter(adapterTZ);

  describe(adapter.lib, () => {
    const testSuitParams: DescribeGregorianAdapterTestSuiteParams<TLocale> = {
      ...params,
      adapter,
      adapterTZ,
      adapterFr,
    };

    testCalculations(testSuitParams);
    testLocalization(testSuitParams);
    testFormat(testSuitParams);
  });
}

type Params<TLocale> = [
  Adapter: new (...args: any) => MuiPickersAdapter<TLocale>,
  params: DescribeGregorianAdapterParams<TLocale>,
];

type DescribeGregorianAdapter = {
  <TLocale>(...args: Params<TLocale>): void;
  skip: <TLocale>(...args: Params<TLocale>) => void;
  only: <TLocale>(...args: Params<TLocale>) => void;
};

export const describeGregorianAdapter = createDescribe(
  'Adapter methods',
  innerGregorianDescribeAdapter,
) as DescribeGregorianAdapter;
