import { Option } from '../data/Option.js'

export { binary_search_by_key } from './binary_search_by_key.js'

export function range(start: number, end: number): number[] {
  const rv: number[] = []
  while (start < end) {
    rv.push(start)
    start++
  }
  return rv
}

export function* rangeIter(start: number, end: number) {
  while (start < end) {
    yield start
    start++
  }
  return
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function wrapping_add_usize(lhs: number, rhs: number): number {
  // NOTE: this seems to work but is definitely wrong
  return lhs + rhs
}

export const max = (self: number[]) => {
  if (self.length === 0) return undefined
  return Math.max.apply(null, self)
}

// convert a boolean to an integer value
export const bton = (b: boolean): number => (b === true ? 1 : 0)

export function filterMap<T, R>(
  items: readonly T[],
  fn: (value: T, index: number) => R | null,
): R[] {
  const result: R[] = []
  items.forEach((value, index) => {
    const mapped = fn(value, index)
    if (mapped !== null) result.push(mapped)
  })
  return result
}

export function saturatingSub(value: number, amount: number): number {
  return Math.max(0, value - amount)
}

export function maxNumber(value: number, other: number): number {
  return Math.max(value, other)
}

export function minNumber(value: number, other: number): number {
  return Math.min(value, other)
}

export function sort_by_key<T>(arr: T[], fn: (a: T) => number | string): void {
  arr.sort((a, b) => {
    const left = fn(a)
    const right = fn(b)
    return typeof left === 'number' && typeof right === 'number'
      ? left - right
      : String(left).localeCompare(String(right))
  })
}

export function min_by_key<T>(arr: T[], fn: (value: T) => number): Option<T> {
  let res: [number, T | null] = [Infinity, null]
  for (let val of arr) {
    if (fn(val) < res[0]) {
      res = [fn(val), val]
    }
  }
  return Option.from(res[1])
}

export const isString = (o: unknown): o is string => typeof o === 'string'
export const isNumber = (o: unknown): o is number => typeof o === 'number'
export const isBoolean = (o: unknown): o is boolean => typeof o === 'boolean'

export const isCallback = (
  maybeFunction: unknown,
): maybeFunction is (...args: never[]) => unknown =>
  typeof maybeFunction === 'function'
