import {
  Label,
  Range,
  Report,
  ReportKind,
  RichText,
  Source,
} from '@magic-works/ariadne'

const filename = 'sample.tao'
const source = `def five = match () in {
    () => 5,
    () => "5",
}

def six =
    five
    + 1`

const numberStart = source.indexOf('5,')
const stringStart = source.indexOf('"5"')
const matchStart = source.indexOf('match')
const matchEnd = source.indexOf('\n}\n') + 2

const output = Report.build(ReportKind.Error, filename, numberStart)
  .with_diag_code(3)
  .with_message(
    RichText.from([
      'Incompatible types ',
      {
        text: '[docs]',
        link: 'https://example.com/error?code=3',
        semanticToken: 'text',
      },
    ]),
  )
  .with_label(
    Label.from([
      filename,
      Range.new(numberStart, numberStart + 1),
    ]).with_message(
      RichText.from([
        'This is of type ',
        { text: 'Nat', semanticToken: 'type' },
      ]),
    ),
  )
  .with_label(
    Label.from([
      filename,
      Range.new(stringStart, stringStart + 3),
    ]).with_message(
      RichText.from([
        'This is of type ',
        { text: 'Str', semanticToken: 'type' },
      ]),
    ),
  )
  .with_label(
    Label.from([filename, Range.new(matchStart, matchEnd)]).with_message(
      RichText.from([
        'The values are outputs of this match expression.\n',
        'Call stack:\n',
        '    ',
        {
          text: 'sample.tao:2:11',
          link: 'https://example.com/source/sample.tao#L2',
          semanticToken: 'string',
        },
        '\n    <main>',
      ]),
    ),
  )
  .with_note('Outputs of match expressions must coerce to the same type')
  .with_location_display((filename, line, column) =>
    RichText.from([
      {
        text: filename + `:${line}:${column}`,
        link: `https://example.com/source/${filename}#L${line ?? 1}`,
        semanticToken: 'string',
      },
    ]),
  )
  .with_semantic_token_capability()
  .with_semantic_token_full((_filename) => {
    // prettier-ignore
    return [
      0, 0, 3, 15, 0,   // def
      0, 4, 4, 8, 1,    // five
      0, 7, 5, 15, 0,   // match
      0, 9, 2, 15, 0,   // in
      1, 10, 1, 19, 0,  // 5
      1, 10, 3, 18, 0,  // "5"
    ]
  })
  .finish()
  .render([filename, Source.from(source)], 'ansi', { maxWidth: 100 })

declare const console: { log(value: string): void }
console.log(output)
