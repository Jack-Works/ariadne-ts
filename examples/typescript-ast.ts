import {
  Label,
  Range,
  Report,
  Source,
  create_semantic_token_from_typescript_ast,
} from '@magic-works/ariadne'
import * as typescript from 'typescript'

const sourceId = 'example.js'
const throws = `throw new Error("hey!")`
const source = `export function main() {
    /** comment */
    ${throws}
}

if (import.meta.main) {
    main()
}`
const provideSemanticTokens =
  create_semantic_token_from_typescript_ast(typescript)
const functionStart = source.indexOf('export function')
const functionEnd = source.indexOf('\n}\n') + 2
const errorStart = source.indexOf('throw')

const output = Report.build(sourceId, errorStart)
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
      range: Range.new(errorStart, errorStart + throws.length),
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
