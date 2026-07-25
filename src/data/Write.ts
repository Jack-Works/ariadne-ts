import { DiagnosticIR, DiagnosticSpan } from '../ir.js'

/** @internal */
export interface Write {
  write(spans: readonly DiagnosticSpan[]): void
}

class IRWriter implements Write {
  private spans: DiagnosticSpan[] = []

  write(spans: readonly DiagnosticSpan[]): void {
    for (const span of spans) {
      if (span.text.length === 0) continue
      const previous = this.spans.at(-1)
      if (
        previous &&
        sameColor(previous.foreground, span.foreground) &&
        sameColor(previous.background, span.background) &&
        sameSemanticToken(previous.semanticToken, span.semanticToken) &&
        previous.link === span.link
      ) {
        previous.text += span.text
      } else {
        this.spans.push({ ...span })
      }
    }
  }

  finish(maxWidth: number): DiagnosticIR {
    return {
      version: 1,
      maxWidth,
      spans: this.spans.map((span) => ({ ...span })),
    }
  }

  toSpans(): DiagnosticSpan[] {
    return this.spans.map((span) => ({ ...span }))
  }
}

function sameSemanticToken(
  left: DiagnosticSpan['semanticToken'],
  right: DiagnosticSpan['semanticToken'],
): boolean {
  if (left === undefined || right === undefined) return left === right
  return (
    left.tokenType === right.tokenType &&
    left.tokenModifiers.length === right.tokenModifiers.length &&
    left.tokenModifiers.every(
      (modifier, index) => modifier === right.tokenModifiers[index],
    )
  )
}

function sameColor(
  left: DiagnosticSpan['foreground'],
  right: DiagnosticSpan['foreground'],
): boolean {
  if (left === undefined || right === undefined) return left === right
  if (left.kind === 'named' && right.kind === 'named') {
    return left.name === right.name
  }
  if (left.kind === 'ansi256' && right.kind === 'ansi256') {
    return left.index === right.index
  }
  return false
}

/** @internal */
export const createIRWriter = () => new IRWriter()
