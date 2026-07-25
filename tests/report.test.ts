import { describe, expect, it } from 'vitest'
import {
  Color,
  Config,
  Label,
  Range,
  Report,
  ReportKind,
  Source,
  renderAnsi,
  renderHtml,
  renderPlain,
} from '../src/index.js'

function render(
  source: string,
  configure: (
    report: ReturnType<typeof Report.build>,
  ) => ReturnType<typeof Report.build>,
  color = false,
): string {
  const filename = 'example.ts'
  const report = configure(
    Report.build(ReportKind.Error, filename, 0)
      .with_code(1)
      .with_message('Invalid expression'),
  )
    .with_config(Config.default().with_color(color))
    .finish()

  return report.render([filename, Source.from(source)], 'plain', {
    maxWidth: 80,
  })
}

describe('Report', () => {
  it('renders an inline label', () => {
    const output = render('const answer = false\n', (report) =>
      report.with_label(
        Label.from(['example.ts', Range.new(15, 20)]).with_message(
          'Expected a number',
        ),
      ),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })

  it('serializes layout IR and renders every backend', async () => {
    const filename = 'example.ts'
    const source = 'const answer = false\n'
    const report = Report.build(ReportKind.Error, filename, 0)
      .with_code(1)
      .with_message('Invalid expression')
      .with_label(
        Label.from([filename, Range.new(15, 20)])
          .with_message('Expected a number')
          .with_color(Color.Named.blue),
      )
      .finish()
    const ir = report.toIR([filename, Source.from(source)], { maxWidth: 80 })

    expect(JSON.parse(JSON.stringify(ir))).toEqual(ir)
    expect(ir).toMatchSnapshot('IR')
    expect(renderPlain(ir)).toMatchSnapshot('plain')
    expect(renderAnsi(ir)).toMatchSnapshot('ANSI')
    await expect(renderHtml(ir)).toMatchFileSnapshot(
      './__snapshots__/report.html',
    )
  })

  it('renders a multiline label and note', () => {
    const source = 'const value = {\n  left: 1,\n  right: "1",\n}\n'
    const leftValue = source.indexOf('1')
    const rightValue = source.indexOf('"1"')
    const output = render(source, (report) =>
      report
        .with_label(
          Label.from(['example.ts', Range.new(14, 43)]).with_message(
            'Fields use incompatible types',
          ),
        )
        .with_label(
          Label.from([
            'example.ts',
            Range.new(leftValue, leftValue + 1),
          ]).with_message('This is a number'),
        )
        .with_label(
          Label.from([
            'example.ts',
            Range.new(rightValue, rightValue + 3),
          ]).with_message('This is a string'),
        )
        .with_note('Object fields must agree'),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })
})
