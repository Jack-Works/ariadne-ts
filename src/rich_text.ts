import { DiagnosticSpan } from './ir.js'
import { ColorValue, Fixed } from './lib/Color.js'
import { DecodedSemanticToken } from './semantic_tokens.js'
import { EditRange, shortestEdit } from './shortest_edit.js'

export interface RichTextSpan {
  readonly text: string
  readonly background?: ColorValue
  readonly link?: string
  readonly semanticToken?: string
  readonly tokenModifiers?: readonly string[]
  readonly diff?: 'before' | 'after'
  readonly language?: string
}

export type RichTextPart = string | RichTextSpan
export type RichTextInput = string | RichText | readonly RichTextPart[]
export type LocationDisplay = (
  sourceId: string,
  line: number | null,
  column: number | null,
) => RichTextInput

export class RichText {
  readonly spans: RichTextSpan[]

  constructor(spans: readonly RichTextPart[]) {
    this.spans = spans.map((span) => {
      if (typeof span === 'string') return { text: span }
      return {
        ...span,
        ...(span.tokenModifiers === undefined
          ? {}
          : { tokenModifiers: [...span.tokenModifiers] }),
      }
    })
  }

  toDiagnosticSpans(): DiagnosticSpan[] {
    return this.spans.map((span) => ({
      text: span.text,
      ...(span.background === undefined ? {} : { background: span.background }),
      ...(span.link === undefined ? {} : { link: span.link }),
      ...(span.semanticToken === undefined
        ? {}
        : {
            semanticToken: {
              tokenType: span.semanticToken,
              tokenModifiers: [...(span.tokenModifiers ?? [])],
            },
          }),
    }))
  }

  lines(): RichText[] {
    const lines: RichTextSpan[][] = [[]]
    for (const span of this.spans) {
      const parts = span.text.split('\n')
      for (const [index, text] of parts.entries()) {
        if (index > 0) lines.push([])
        if (text.length > 0) lines.at(-1)?.push({ ...span, text })
      }
    }
    return lines.map((line) => new RichText(line))
  }

  wrap(maxWidth: number): RichText[] {
    if (!Number.isInteger(maxWidth) || maxWidth <= 0) {
      throw new Error('maxWidth must be a positive integer')
    }
    return this.lines().flatMap((line) => line.wrapLine(maxWidth))
  }

  resolveDiff(
    provideSemanticTokens: (
      sourceText: string,
      language: string,
    ) => DecodedSemanticToken[],
  ): RichText {
    const spans: RichTextPart[] = []
    const edits = diffEdits(this.spans)
    for (const [index, span] of this.spans.entries()) {
      if (span.diff === undefined) {
        spans.push(span)
        continue
      }
      const background = span.diff === 'before' ? Fixed(224) : Fixed(194)
      const changedBackground = span.diff === 'before' ? Fixed(217) : Fixed(157)
      spans.push({ text: span.diff === 'before' ? '- ' : '+ ', background })
      spans.push(
        ...applyChangedBackground(
          semanticText(
            span.text,
            provideSemanticTokens(span.text, span.language ?? ''),
            background,
          ),
          edits.get(index) ?? [{ start: 0, end: span.text.length }],
          changedBackground,
        ),
      )
      if (
        !span.text.endsWith('\n') &&
        this.spans[index + 1]?.diff !== undefined
      ) {
        spans.push('\n')
      }
    }
    return new RichText(spans)
  }

  private wrapLine(maxWidth: number): RichText[] {
    const wrapped: RichText[] = []
    let remaining: RichText = this
    while (remaining.toString().length > maxWidth) {
      const text = remaining.toString()
      const whitespace = text.lastIndexOf(' ', maxWidth)
      const breakAt = whitespace > 0 ? whitespace : maxWidth
      wrapped.push(remaining.slice(0, breakAt))
      remaining = remaining.slice(
        breakAt + (whitespace === breakAt ? 1 : 0),
        text.length,
      )
    }
    wrapped.push(remaining)
    return wrapped
  }

  private slice(start: number, end: number): RichText {
    const spans: RichTextSpan[] = []
    let offset = 0
    for (const span of this.spans) {
      const spanStart = offset
      const spanEnd = offset + span.text.length
      const sliceStart = Math.max(start, spanStart)
      const sliceEnd = Math.min(end, spanEnd)
      if (sliceStart < sliceEnd) {
        spans.push({
          ...span,
          text: span.text.slice(sliceStart - spanStart, sliceEnd - spanStart),
        })
      }
      offset = spanEnd
      if (offset >= end) break
    }
    return new RichText(spans)
  }

  toString(): string {
    return this.spans.map((span) => span.text).join('')
  }

  static from(input: RichTextInput): RichText {
    if (input instanceof RichText) return input
    return new RichText(typeof input === 'string' ? [input] : input)
  }
}

function diffEdits(spans: readonly RichTextSpan[]): Map<number, EditRange[]> {
  const result = new Map<number, EditRange[]>()
  for (let index = 0; index < spans.length - 1; index++) {
    const before = spans[index]
    const after = spans[index + 1]
    if (before?.diff !== 'before' || after?.diff !== 'after') continue
    const edit = shortestEdit(before.text, after.text)
    result.set(index, edit.before)
    result.set(index + 1, edit.after)
    index++
  }
  return result
}

function applyChangedBackground(
  spans: readonly RichTextSpan[],
  changed: readonly EditRange[],
  background: ColorValue,
): RichTextSpan[] {
  if (changed.length === 0) return [...spans]
  const result: RichTextSpan[] = []
  let offset = 0
  for (const span of spans) {
    const boundaries = new Set([0, span.text.length])
    for (const range of changed) {
      const start = Math.max(0, range.start - offset)
      const end = Math.min(span.text.length, range.end - offset)
      if (start < end) {
        boundaries.add(start)
        boundaries.add(end)
      }
    }
    const sortedBoundaries = [...boundaries].sort((left, right) => left - right)
    for (let index = 0; index < sortedBoundaries.length - 1; index++) {
      const start = sortedBoundaries[index]!
      const end = sortedBoundaries[index + 1]!
      const absoluteStart = offset + start
      const isChanged = changed.some(
        (range) => range.start <= absoluteStart && absoluteStart < range.end,
      )
      result.push({
        ...span,
        text: span.text.slice(start, end),
        ...(isChanged ? { background } : {}),
      })
    }
    offset += span.text.length
  }
  return result
}

function semanticText(
  text: string,
  tokens: readonly DecodedSemanticToken[],
  background: ColorValue,
): RichTextSpan[] {
  const lineStarts = [0]
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') lineStarts.push(index + 1)
  }
  const spans: RichTextSpan[] = []
  let offset = 0
  for (const token of tokens) {
    const lineStart = lineStarts[token.line]
    if (lineStart === undefined) continue
    const start = lineStart + token.start
    const end = start + token.length
    if (start < offset || end > text.length) continue
    if (start > offset) {
      spans.push({ text: text.slice(offset, start), background })
    }
    spans.push({
      text: text.slice(start, end),
      background,
      semanticToken: token.tokenType,
      tokenModifiers: token.tokenModifiers,
    })
    offset = end
  }
  if (offset < text.length) {
    spans.push({ text: text.slice(offset), background })
  }
  return spans
}
