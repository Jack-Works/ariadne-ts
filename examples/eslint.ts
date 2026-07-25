import {
  Config,
  Label,
  LabelAttach,
  Range,
  Report,
  ReportKind,
  RichText,
  Source,
  create_semantic_token_from_estree_ast,
} from '@magic-works/ariadne'
import { parse } from '@babel/parser'
import { VISITOR_KEYS } from '@babel/types'

const sourceId = 'example.ts'
const source = `import type { Option } from 'std';
const x = new Option(1);`
const provideSemanticTokens = create_semantic_token_from_estree_ast(
  (sourceText) =>
    parse(sourceText, {
      sourceType: 'module',
      plugins: ['typescript'],
      tokens: true,
    }),
  { visitorKeys: VISITOR_KEYS },
)

const diff = RichText.from([
  'Suggested fix:\n',
  {
    diff: 'before',
    text: "import type { Option } from 'std';",
    language: 'typescript',
  },
  {
    diff: 'after',
    text: "import { Option } from 'std';",
    language: 'typescript',
  },
  '\n',
])

const importStart = source.indexOf('import')
const importEnd = source.indexOf('\n')
const valueUseStart = source.indexOf('new Option')
const output = Report.build(ReportKind.Error, sourceId, valueUseStart)
  .with_message('Type-only import used as a value')
  .with_label(
    Label.from({
      sourceId,
      range: Range.new(valueUseStart, valueUseStart + 'new Option'.length),
    }).with_message('Option is used as a value here'),
  )
  .with_label(
    Label.from({
      sourceId,
      range: Range.new(importStart, importEnd),
    }).with_message(diff),
  )
  .with_note(
    'A name imported with `import type` can only be used in type positions, and cannot be used as a value.',
  )
  .with_config(Config.default().with_label_attach(LabelAttach.Start))
  .with_semantic_token_capability()
  .with_semantic_token_ranged(provideSemanticTokens)
  .finish()
  .render({ sourceId, source: Source.from(source) }, 'ansi', {
    maxWidth: 60,
    contextLines: 1,
  })

declare const console: { log(value: string): void }
console.log(output)
