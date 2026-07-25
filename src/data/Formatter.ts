import { DiagnosticSpan } from '../ir.js'
import { createIRWriter, type Write } from './Write.js'

export interface Formatter {
  buf: Write
}

export interface IRFormatter extends Formatter {
  toSpans(): DiagnosticSpan[]
}

export const irFormatter = (): IRFormatter => {
  const writer = createIRWriter()
  return {
    buf: writer,
    toSpans: () => writer.toSpans(),
  }
}
