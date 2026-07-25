import { DiagnosticSpan } from './ir.js'

export interface RichTextSpan {
  readonly text: string
  readonly link?: string
  readonly semanticToken?: string
  readonly tokenModifiers?: readonly string[]
}

export type RichTextPart = string | RichTextSpan
export type RichTextInput = string | RichText | readonly RichTextPart[]
export type LocationDisplay = (
  filename: string,
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

  toString(): string {
    return this.spans.map((span) => span.text).join('')
  }

  static from(input: RichTextInput): RichText {
    if (input instanceof RichText) return input
    return new RichText(typeof input === 'string' ? [input] : input)
  }
}
