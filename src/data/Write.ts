import { DiagnosticIR, DiagnosticSpan } from '../ir.js'

export interface Write {
  write(spans: readonly DiagnosticSpan[]): void
}

class IRWriter implements Write {
  private spans: DiagnosticSpan[] = []

  write(spans: readonly DiagnosticSpan[]): void {
    for (const span of spans) {
      if (span.text.length === 0) continue
      const previous = this.spans.at(-1)
      if (previous && sameColor(previous.foreground, span.foreground)) {
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

export const createIRWriter = () => new IRWriter()
