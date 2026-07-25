import { Display, isDisplay } from './data/Display.js'
import { stringFormatter } from './data/Formatter.js'
import { isOption, Option } from './data/Option.js'
import { isResult, Result } from './data/Result.js'
import { Write } from './data/Write.js'
import { isShow, Show } from './data/Show.js'

export type Displayable<T = unknown, E = unknown> =
  Display | Show | Option<T> | Result<T, E> | string | number

export function write<W extends Write>(w: W, ...args: Displayable[]) {
  w.write_fmt(format(...args.map(fromRust)))
}

export function format(...args: Displayable[]): string {
  const [head, ...rest] = args.map(fromRust)
  let index = 0
  return head.replaceAll(/\{\{|\}\}|\{\}/g, (placeholder) => {
    if (placeholder === '{{') return '{'
    if (placeholder === '}}') return '}'
    return rest[index++] ?? placeholder
  })
}

function fromRust(value: Displayable): string {
  if (isDisplay(value)) {
    return value.display()
  }
  if (isShow(value)) {
    let f = stringFormatter()
    value.fmt(f)
    return f.unwrap()
  }
  if (isOption<string>(value)) {
    return value.unwrap_or_else(() => '')
  }
  if (isResult(value)) {
    return String(value.unwrap_or_else(() => '<(Unwrap Err)>'))
  }
  return value.toString()
}

export function writeln<W extends Write>(w: W, ...args: Displayable[]) {
  let val = format(...args.map(fromRust))
  w.write_fmt(val)
  w.write_fmt('\n')
}
