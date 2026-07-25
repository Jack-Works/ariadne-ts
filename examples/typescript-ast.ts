import {
  Label,
  Range,
  Report,
  ReportKind,
  Source,
  create_semantic_token_from_typescript_ast,
} from '@magic-works/ariadne'
import * as typescript from 'typescript'

const filename = 'example.js'
const throws = `throw new Error("hey!")`
const source = `export function main() {
    /** comment */
    ${throws}
}

if (import.meta.main) {
    main()
}`
const sourceFile = typescript.createSourceFile(
  filename,
  source,
  typescript.ScriptTarget.Latest,
  true,
  typescript.ScriptKind.JS,
)
const provideSemanticTokens = create_semantic_token_from_typescript_ast(
  (requestedFilename) =>
    requestedFilename === filename ? sourceFile : undefined,
  typescript,
)
const functionStart = source.indexOf('export function')
const functionEnd = source.indexOf('\n}\n') + 2
const errorStart = source.indexOf('throw')

const output = Report.build(ReportKind.Error, filename, errorStart)
  .with_message('hey!')
  .with_label(
    Label.from({
      src: filename,
      range: Range.new(functionStart, functionEnd),
    }),
  )
  .with_label(
    Label.from({
      src: filename,
      range: Range.new(errorStart, errorStart + throws.length),
    }).with_message('Error: hey!'),
  )
  .with_semantic_token_capability()
  .with_semantic_token_ranged(provideSemanticTokens)
  .finish()
  .render({ id: filename, source: Source.from(source) }, 'ansi', {
    maxWidth: 100,
    contextLines: 4,
  })

declare const console: { log(value: string): void }
console.log(output)
