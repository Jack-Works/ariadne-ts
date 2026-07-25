export { Display } from './data/Display.js'
export { Range } from './data/Range.js'
export { Color, Fixed } from './lib/Color.js'
export type { ColorValue } from './lib/Color.js'
export { ColorGenerator } from './lib/ColorGenerator.js'
export { Config } from './lib/Config.js'
export { Label } from './lib/Label.js'
export { Report } from './lib/Report.js'
export { ReportKind } from './lib/ReportKind.js'
export { Source, sources } from './lib/Source.js'
export { createDiagnostic } from './diagnostics.js'
export { renderAnsi, renderHtml, renderIR, renderPlain } from './ir.js'
export type {
  DiagnosticIR,
  DiagnosticSpan,
  LayoutOptions,
  OutputBackend,
} from './ir.js'
export { format } from './write.js'
