import { Label, Range, Report, ReportKind, Source } from '@magic-works/ariadne'

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
  .with_code(3)
  .with_message('Incompatible types')
  .with_label(
    Label.from([
      filename,
      Range.new(numberStart, numberStart + 1),
    ]).with_message('This is of type Nat'),
  )
  .with_label(
    Label.from([
      filename,
      Range.new(stringStart, stringStart + 3),
    ]).with_message('This is of type Str'),
  )
  .with_label(
    Label.from([filename, Range.new(matchStart, matchEnd)]).with_message(
      'The values are outputs of this match expression.',
    ),
  )
  .with_note('Outputs of match expressions must coerce to the same type')
  .finish()
  .render([filename, Source.from(source)])

declare const console: { log(value: string): void }
console.log(output)
