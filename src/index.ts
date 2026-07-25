// Core diagnostic API
export { Report } from './lib/Report.js'
export { Label } from './lib/Label.js'
export { Range } from './data/Range.js'
export { Source } from './lib/Source.js'
export type { LayoutOptions, OutputBackend } from './ir.js'
export type { SpanInit } from './data/Span.js'
export type { SourceEntry, SourceInput } from './lib/Source.js'

// Optional customization, rendering, and integrations
export { RichText } from './rich_text.js'
export type {
  LocationDisplay,
  RichTextInput,
  RichTextPart,
  RichTextSpan,
} from './rich_text.js'
export { createDiagnostic } from './diagnostics.js'
export { Config } from './lib/Config.js'
export { LabelAttach } from './lib/Config.js'
export { Color, Fixed } from './lib/Color.js'
export type { ColorValue } from './lib/Color.js'
export { ColorGenerator } from './lib/ColorGenerator.js'
export { sources } from './lib/Source.js'
export {
  ANSI_IR_Render,
  defaultANSISemanticTokenColorScheme,
  defaultHTMLSemanticTokenColorScheme,
  defaultHTMLTextColorScheme,
  HTML_IR_Render,
  IR_Render,
  Plain_IR_Render,
  renderAnsi,
  renderHtml,
  renderIR,
  renderPlain,
} from './ir.js'
export type {
  ANSISemanticTokenColorScheme,
  DiagnosticIR,
  DiagnosticSpan,
  HTMLSemanticTokenColorScheme,
  HTMLTextColorScheme,
} from './ir.js'
export {
  semanticTokenModifiers,
  semanticTokenTypes,
} from './semantic_tokens.js'
export type {
  DecodedSemanticToken,
  SemanticToken,
  SemanticTokenCapability,
  SemanticTokenProvider,
} from './semantic_tokens.js'
export {
  create_semantic_token_from_estree_ast,
  create_semantic_token_from_typescript_ast,
} from './semantic_tokens/index.js'
export type { JavaScriptASTSemanticTokenImports } from './semantic_tokens/index.js'
