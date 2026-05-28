/**
 * Local stand-in for `@mui/internal-test-utils/createDescribe`. Wraps a
 * callback in a vitest `describe(message, ...)` block and exposes `.skip` /
 * `.only` variants. Directly equivalent to the upstream implementation
 * (which is itself ~20 lines).
 */
import { describe } from 'vitest';

type Inner<A extends any[]> = (...args: A) => void;

export interface MuiDescribe<A extends any[]> {
  (...args: A): void;
  skip: (...args: A) => void;
  only: (...args: A) => void;
}

export function createDescribe<A extends any[]>(
  message: string,
  callback: Inner<A>,
): MuiDescribe<A> {
  const muiDescribe = ((...args: A) => {
    describe(message, () => {
      callback(...args);
    });
  }) as MuiDescribe<A>;
  muiDescribe.skip = (...args: A) => {
    describe.skip(message, () => {
      callback(...args);
    });
  };
  muiDescribe.only = (...args: A) => {
    describe.only(message, () => {
      callback(...args);
    });
  };
  return muiDescribe;
}
