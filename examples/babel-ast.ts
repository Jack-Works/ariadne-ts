import {
  Label,
  Range,
  Report,
  ReportKind,
  Source,
  create_semantic_token_from_estree_ast,
} from '@magic-works/ariadne'
import { parse } from '@babel/parser'
import { VISITOR_KEYS } from '@babel/types'

const sourceId = 'example.js'
const source = `export function main() {
    /** comment */
    throw new Error("hey!")
}

if (import.meta.main) {
    main()
}`
const provideSemanticTokens = create_semantic_token_from_estree_ast(
  (sourceText) =>
    parse(sourceText, {
      sourceType: 'module',
      tokens: true,
    }),
  { visitorKeys: VISITOR_KEYS },
)
const functionStart = source.indexOf('export function')
const functionEnd = source.indexOf('\n}\n') + 2
const errorStart = source.indexOf('throw')
const output = Report.build(ReportKind.Error, sourceId, errorStart)
  .with_message('hey!')
  .with_label(
    Label.from({
      sourceId,
      range: Range.new(functionStart, functionEnd),
    }),
  )
  .with_label(
    Label.from({
      sourceId,
      range: Range.new(
        errorStart,
        errorStart + 'throw new Error("hey!")'.length,
      ),
    }).with_message('Error: hey!'),
  )
  .with_semantic_token_capability()
  .with_semantic_token_ranged(provideSemanticTokens)
  .finish()
  .render({ sourceId, source: Source.from(source) }, 'ansi', {
    maxWidth: 100,
    contextLines: 4,
  })

declare const console: { log(value: string): void }
console.log(output)
