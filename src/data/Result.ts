export type Result<T, E> = Ok<T, E> | Err<T, E>

class Ok<T, E> {
  constructor(private value: T) {}
  map<R>(fn: (value: T) => R): Result<R, E> {
    return ok(fn(this.value))
  }
  is_err(): this is Err<T, E> {
    return false
  }
  unwrap(): T {
    return this.value
  }
  unwrap_or_else(): T {
    return this.value
  }
}

export class Err<T, E> {
  constructor(private value: E) {}
  map<R>(): Result<R, E> {
    return err(this.value)
  }
  unwrap(): E {
    return this.value
  }
  unwrap_or_else<R>(d: (v: E) => R): R {
    return d(this.value)
  }
  is_err(): this is Err<T, E> {
    return true
  }
}

export const ok = <T, E>(value: T): Result<T, E> => {
  return new Ok<T, E>(value)
}

export const err = <T, E>(value: E): Result<T, E> => {
  return new Err<T, E>(value)
}

export const isResult = (o: unknown): o is Result<unknown, unknown> => {
  return o instanceof Ok || o instanceof Err
}
