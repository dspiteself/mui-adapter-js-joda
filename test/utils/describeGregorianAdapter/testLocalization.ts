/**
 * Ported from MUI X `test/utils/pickers/describeGregorianAdapter/testLocalization.ts` (MIT).
 *
 * Dropped the upstream moment-specific branch (moment.locale('en')) since we
 * don't depend on moment.
 */
import { it } from 'vitest';
import type { AdapterFormats } from '@mui/x-date-pickers/models';
import { expect } from '../expect-chai-compat.js';
import { cleanText } from '../pickers.js';
import type { DescribeGregorianAdapterTestSuite } from './describeGregorianAdapter.types.js';
import { TEST_DATE_ISO_STRING } from './describeGregorianAdapter.utils.js';

export const testLocalization: DescribeGregorianAdapterTestSuite = ({
  adapter,
}) => {
  const testDateIso = adapter.date(TEST_DATE_ISO_STRING)!;

  it('Method: formatNumber', () => {
    expect(adapter.formatNumber('1')).to.equal('1');
  });

  it('Method: expandFormat', () => {
    const testFormat = (formatKey: keyof AdapterFormats) => {
      const formatString = adapter.formats[formatKey];
      const expandedFormat = cleanText(adapter.expandFormat(formatString));

      if (
        expandedFormat === formatString ||
        (adapter.lib === 'luxon' && formatString === 'ccccc')
      ) {
        return;
      }

      // The expanded format should be fully expanded
      expect(cleanText(adapter.expandFormat(expandedFormat))).to.equal(expandedFormat);

      // Both format should be equivalent
      expect(cleanText(adapter.formatByString(testDateIso, expandedFormat))).to.equal(
        cleanText(adapter.format(testDateIso, formatKey)),
      );
    };

    Object.keys(adapter.formats).forEach((formatKey) => {
      testFormat(formatKey as keyof AdapterFormats);
    });
  });

  it('Method: getCurrentLocaleCode', () => {
    expect(adapter.getCurrentLocaleCode()).to.match(/en/);
  });
};
