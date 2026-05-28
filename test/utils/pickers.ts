/**
 * Subset of `test/utils/pickers` from the MUI X repo — only the helpers the
 * Gregorian adapter suite actually uses. Sourced from `misc.ts` and
 * `fields.tsx` in mui-x@9.3.0 (MIT).
 */
import type {
  MuiPickersAdapter,
  PickerValidDate,
} from '@mui/x-date-pickers/models';

export const getDateOffset = (
  adapter: MuiPickersAdapter,
  date: PickerValidDate,
): number => {
  const utcHour = adapter.getHours(
    adapter.setTimezone(adapter.startOfDay(date), 'UTC'),
  );
  const cleanUtcHour = utcHour > 12 ? 24 - utcHour : -utcHour;
  return cleanUtcHour * 60;
};

export const cleanText = (
  text: string,
  specialCase?: 'singleDigit' | 'RTL',
): string => {
  let clean = text.replace(/ /g, ' ');
  clean = text.replace(/​/g, '');
  switch (specialCase) {
    case 'singleDigit':
      return clean.replace(/‎/g, '');
    case 'RTL':
      return clean.replace(/⁦|⁧|⁨|⁩/g, '');
    default:
      return clean;
  }
};
