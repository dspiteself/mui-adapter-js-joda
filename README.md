# mui-adapter-js-joda

A [MUI X Date Pickers][mui-x-date-pickers] adapter for [js-joda][js-joda], so
you can use `LocalDate`, `LocalDateTime`, and `ZonedDateTime` as the picker's
value type instead of `Date`, Day.js, Luxon, or Moment.

Originally derived from [`@date-io/js-joda`][date-io], updated for the
`MuiPickersAdapter` interface used by current MUI X.

## Install

```sh
pnpm add mui-adapter-js-joda \
  @js-joda/core @js-joda/locale @js-joda/locale_en-us \
  @mui/x-date-pickers
```

`@js-joda/locale_en-us` is listed as an optional peer — substitute any
[`@js-joda/locale_*`][js-joda-locale] prebuilt package if you need a different
locale. In `@js-joda/locale` v5 these prebuilt packages are **side-effect
only**: they register CLDR data with `@js-joda/locale`, where the `Locale`
class itself lives.

## Use

```tsx
import { AdapterJsJoda } from 'mui-adapter-js-joda';
import { Locale } from '@js-joda/locale';
// Side-effect import: registers en/en-US data. Pick the locale package(s)
// that match the locales you support.
import '@js-joda/locale_en-us';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

export function App() {
  return (
    <LocalizationProvider
      dateAdapter={AdapterJsJoda}
      adapterLocale={Locale.US}
    >
      <DatePicker label="Pick a date" />
    </LocalizationProvider>
  );
}
```

The picker's value will be a `LocalDate`, `LocalDateTime`, or `ZonedDateTime`
depending on which picker you use and whether a timezone is in play.

## Develop

```sh
pnpm install
pnpm typecheck   # tsc --noEmit
pnpm test        # vitest run
pnpm build       # vite build -> dist/
```

## License

BSD-3-Clause, matching upstream js-joda. Incorporates portions of
[`@date-io/js-joda`][date-io] (© 2017 Dmitriy Kovalenko, MIT) and ported test
infrastructure from [MUI X][mui-x] (© 2019 Material-UI SAS, MIT). See
[LICENSE](./LICENSE) for the full notices.

[mui-x]: https://github.com/mui/mui-x

[mui-x-date-pickers]: https://mui.com/x/react-date-pickers/
[js-joda]: https://js-joda.github.io/js-joda/
[js-joda-locale]: https://www.npmjs.com/search?q=%40js-joda%2Flocale_
[date-io]: https://github.com/dmtrKovalenko/date-io
