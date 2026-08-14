// Minimal test harness for FLYYY.AI — no external dependencies.
// Provides describe/it/expect style API backed by Node's assert.
// Run with: npm test

export function describe(_name: string, fn: () => void): void {
  fn();
}

type ItFn = () => void;
const tests: { name: string; fn: ItFn }[] = [];

export function it(name: string, fn: ItFn): void {
  tests.push({ name, fn });
}

interface Expect<T> {
  toBe(expected: T): void;
  toEqual(expected: unknown): void;
  toContain(item: unknown): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  not: Expect<T>;
  get length(): number;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => deepEqual(v, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return false;
}

function makeExpect<T>(value: T, negated = false): Expect<T> {
  const check = (condition: boolean, msg: string) => {
    if (negated ? condition : !condition) {
      throw new Error(`${negated ? "Expected NOT: " : ""}${msg}`);
    }
  };
  const self: Expect<T> = {
    toBe(expected: T) { check(Object.is(value, expected), `expected ${String(value)} to be ${String(expected)}`); },
    toEqual(expected: unknown) { check(deepEqual(value, expected), `expected ${JSON.stringify(value)} to equal ${JSON.stringify(expected)}`); },
    toContain(item: unknown) {
      if (typeof value === "string") {
        check(value.includes(String(item)), `expected "${value}" to contain "${String(item)}"`);
      } else if (Array.isArray(value)) {
        check(value.some((v) => deepEqual(v, item)), `expected array to contain ${JSON.stringify(item)}`);
      } else {
        throw new Error("toContain: value is not a string or array");
      }
    },
    toBeTruthy() { check(!!value, `expected ${String(value)} to be truthy`); },
    toBeFalsy() { check(!value, `expected ${String(value)} to be falsy`); },
    toBeNull() { check(value === null, `expected ${String(value)} to be null`); },
    get not() { return makeExpect(value, true); },
    get length() { return (value as unknown as { length: number }).length; },
  };
  return self;
}

export function expect<T>(value: T): Expect<T> {
  return makeExpect(value);
}

// Runner — executed when the file is the entry point.
// We collect tests via describe/it and run them at process exit.
export async function runAll(): Promise<void> {
  let passed = 0;
  let failed = 0;
  for (const t of tests) {
    try {
      t.fn();
      passed++;
    } catch (e) {
      failed++;
      console.error(`  FAIL: ${t.name}\n    ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  console.log(`\n  ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}
