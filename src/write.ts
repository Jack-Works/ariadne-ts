import { Display, isDisplay } from './data/Display.js'
import { irFormatter } from './data/Formatter.js'
import { isOption, Option } from './data/Option.js'
import { isResult, Result } from './data/Result.js'
import { Write } from './data/Write.js'
import { isShow, Show } from './data/Show.js'
import { DiagnosticSpan } from './ir.js'
import { RichText } from './rich_text.js'

export type Displayable<T = unknown, E = unknown> =
  Display | RichText | Show | Option<T> | Result<T, E> | string | number

/** @internal */
export function write<W extends Write>(w: W, ...args: Displayable[]) {
  w.write(formatSpans(...args))
}

/** @internal */
export function format(...args: Displayable[]): string {
  return formatSpans(...args)
    .map((span) => span.text)
    .join('')
}

function formatSpans(...args: Displayable[]): DiagnosticSpan[] {
  const [head = [], ...rest] = args.map(toSpans)
  const template = head.map((span) => span.text).join('')
  const spans: DiagnosticSpan[] = []
  let index = 0
  let cursor = 0

  for (const match of template.matchAll(/\{\{|\}\}|\{\}/g)) {
    const offset = match.index
    if (offset > cursor) spans.push({ text: template.slice(cursor, offset) })
    const placeholder = match[0]
    if (placeholder === '{{') spans.push({ text: '{' })
    else if (placeholder === '}}') spans.push({ text: '}' })
    else spans.push(...(rest[index++] ?? [{ text: placeholder }]))
    cursor = offset + placeholder.length
  }
  if (cursor < template.length) spans.push({ text: template.slice(cursor) })
  return spans
}

function toSpans(value: Displayable): DiagnosticSpan[] {
  if (value instanceof RichText) {
    return value.toDiagnosticSpans()
  }
  if (isDisplay(value)) {
    return [value.toSpan()]
  }
  if (isShow(value)) {
    let f = irFormatter()
    value.fmt(f)
    return f.toSpans()
  }
  if (isOption<string>(value)) {
    return [{ text: value.unwrap_or_else(() => '') }]
  }
  if (isResult(value)) {
    return [{ text: String(value.unwrap_or_else(() => '<(Unwrap Err)>')) }]
  }
  return [{ text: value.toString() }]
}

/** @internal */
export function writeln<W extends Write>(w: W, ...args: Displayable[]) {
  w.write(formatSpans(...args))
  w.write([{ text: '\n' }])
}
