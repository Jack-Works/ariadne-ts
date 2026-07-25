export {}

declare global {
  interface Array<T> {
    enumerate(): [number, T][]
    filter_map<B>(fn: (value: T, index: number) => B | null): B[]
    max_by_key(fn: (value: T, index: number) => number): T
    chain(arg: T[]): T[]
  }

  interface Number {
    saturating_sub(n: number): number
    max(n: number): number
    min(n: number): number
  }
}

Array.prototype.enumerate = function <T>(this: T[]): [number, T][] {
  let i = 0
  const rv: [number, T][] = []
  for (let item of this) rv.push([i++, item])
  return rv
}

Array.prototype.filter_map = function <T, B>(
  this: T[],
  fn: (value: T, index: number) => B | null,
): B[] {
  return this.map(fn).filter((n) => n !== null) as B[]
}

Array.prototype.max_by_key = function <T>(
  this: T[],
  fn: (value: T, index: number) => number,
): T {
  return this.reduce((maximum, value, index) =>
    fn(value, index) > fn(maximum, index) ? value : maximum,
  )
}

Array.prototype.chain = function <T>(this: T[], that: T[]): T[] {
  return this.concat(that)
}

Number.prototype.saturating_sub = function (n: number): number {
  return this.valueOf() - n
}

Number.prototype.max = function (n: number): number {
  return Math.max(this.valueOf(), n)
}

Number.prototype.min = function (n: number): number {
  return Math.min(this.valueOf(), n)
}
