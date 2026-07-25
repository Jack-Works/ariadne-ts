import { Formatter } from './Formatter.js'
import { isOption } from './Option.js'
import { isResult } from './Result.js'
import { isCallback } from '../utils/index.js'
import { write } from '../write.js'
import { RichText } from '../rich_text.js'

export class Show {
  constructor(public self: unknown) {}
  fmt(f: Formatter): void {
    if (isOption<string>(this.self)) {
      this.self.map((x) => new Show(x).fmt(f))
      return
    }
    if (isResult(this.self)) {
      this.self.map((x) => new Show(x).fmt(f))
      return
    }
    if (typeof this.self === 'string') {
      write(f.buf, '{}', this.self)
      return
    }
    if (this.self instanceof RichText) {
      write(f.buf, '{}', this.self)
      return
    }
    // TODO: this is all probably wrong
    if (Array.isArray(this.self) && this.self.length === 2) {
      const [value, operation] = this.self
      if (
        isCallback(operation) &&
        typeof value === 'object' &&
        value !== null &&
        Symbol.iterator in value
      ) {
        const render = operation as (
          formatter: Formatter,
          item: unknown,
        ) => void
        for (const item of value as Iterable<unknown>) {
          render(f, item)
        }
      } else if (typeof operation === 'number') {
        for (let count = 0; count < operation; count++) {
          write(f.buf, '{}', String(value))
        }
      }
    } else {
      write(f.buf, '{}', String(this.self))
      return
    }
  }

  static is = (o: unknown): o is Show => o instanceof Show
}

export const isShow = Show.is
