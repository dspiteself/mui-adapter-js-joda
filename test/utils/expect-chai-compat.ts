/**
 * Thin chai-style shim over vitest's `expect`, so the ported MUI X adapter
 * test suite can use `expect(x).to.equal(y)` / `to.have.length(n)` /
 * `to.be.instanceOf(C)` / `to.be.lessThan(n)` / `to.match(re)` verbatim
 * without rewriting every assertion. Only covers the surface the suite
 * actually uses.
 */
import { expect as vitestExpect } from 'vitest';

type Chainable = {
  equal: (expected: unknown) => void;
  match: (re: RegExp) => void;
  instanceOf: (ctor: any) => void;
  lessThan: (n: number) => void;
  length: (n: number) => void;
};

interface ChaiExpect {
  to: {
    equal: (expected: unknown) => void;
    match: (re: RegExp) => void;
    be: Chainable;
    have: { length: (n: number) => void };
  };
  toEqualDateTime: (expected: unknown) => void;
}

export const expect = (received: unknown): ChaiExpect => {
  const v = vitestExpect(received);
  const equal = (expected: unknown) => v.toBe(expected);
  const match = (re: RegExp) => v.toMatch(re);
  const instanceOf = (ctor: any) => v.toBeInstanceOf(ctor);
  const lessThan = (n: number) => v.toBeLessThan(n);
  const length = (n: number) => v.toHaveLength(n);

  return {
    to: {
      equal,
      match,
      be: { equal, match, instanceOf, lessThan, length },
      have: { length },
    },
    // Custom matcher is registered globally in test/setup.ts; call through.
    toEqualDateTime: (expected) => (v as any).toEqualDateTime(expected),
  };
};
