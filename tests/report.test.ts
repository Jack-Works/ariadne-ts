import { describe, expect, it } from 'vitest'
import {
  Config,
  defaultHTMLTextColorScheme,
  Label,
  Range,
  Report,
  ReportKind,
  RichText,
  Source,
  renderAnsi,
  renderHtml,
  renderPlain,
  semanticTokenModifiers,
  semanticTokenTypes,
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
      .with_diag_code(1)
      .with_message('Invalid expression'),
  )
    .with_config(Config.default().with_color(color))
    .finish()

  return report.render({ id: filename, source: Source.from(source) }, 'plain', {
    maxWidth: 80,
  })
}

describe('Report', () => {
  it('renders an inline label', () => {
    const output = render('const answer = false\n', (report) =>
      report.with_label(
        Label.from({
          src: 'example.ts',
          range: Range.new(15, 20),
        }).with_message('Expected a number'),
      ),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })

  it('serializes layout IR and renders every backend', async () => {
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
    let fullRequest = ''
    const report = Report.build(ReportKind.Error, filename, numberStart)
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
        Label.from({
          src: filename,
          range: Range.new(numberStart, numberStart + 1),
        }).with_message(
          RichText.from([
            'This is of type ',
            { text: 'Nat', semanticToken: 'type' },
          ]),
        ),
      )
      .with_label(
        Label.from({
          src: filename,
          range: Range.new(stringStart, stringStart + 3),
        }).with_message(
          RichText.from([
            'This is of type ',
            { text: 'Str', semanticToken: 'type' },
          ]),
        ),
      )
      .with_label(
        Label.from({
          src: filename,
          range: Range.new(matchStart, matchEnd),
        }).with_message(
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
      .with_location_display((displayFilename, line, column) =>
        RichText.from([
          {
            text: displayFilename + `:${line}:${column}`,
            link: `https://example.com/source/${displayFilename}#L${line ?? 1}`,
            semanticToken: 'string',
          },
        ]),
      )
      .with_semantic_token_capability()
      .with_semantic_token_full((requestedFilename) => {
        fullRequest = requestedFilename
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
    const ir = report.toIR(
      { id: filename, source: Source.from(source) },
      { maxWidth: 100 },
    )

    expect(fullRequest).toBe(filename)
    expect({
      semanticTokenTypes,
      semanticTokenModifiers,
    }).toMatchSnapshot('LSP semantic token defaults')
    expect(defaultHTMLTextColorScheme.ansi256).toHaveLength(256)
    expect(ir.spans.filter((span) => span.link !== undefined).length).toBe(3)
    const sourceTokens = ir.spans.filter(
      (span) => span.semanticToken !== undefined,
    )
    expect(sourceTokens.length).toBeGreaterThan(0)
    expect(
      sourceTokens.find((span) => span.text === 'def')?.semanticToken
        ?.tokenModifiers,
    ).toContain('unquoted')
    expect(
      sourceTokens.find((span) => span.text === 'match')?.semanticToken
        ?.tokenModifiers,
    ).not.toContain('unquoted')
    expect(JSON.parse(JSON.stringify(ir))).toEqual(ir)
    expect(ir).toMatchSnapshot('IR')
    expect(renderPlain(ir)).toMatchSnapshot('plain')
    expect(renderAnsi(ir)).toMatchSnapshot('ANSI')
    await expect(renderHtml(ir)).toMatchFileSnapshot(
      './__snapshots__/report.html',
    )
  })

  it('requests ranged semantic tokens for the laid out lines', () => {
    const filename = 'example.ts'
    const source = 'skip\nconst value = 1\nskip\n'
    const lineStart = source.indexOf('const')
    const lineEnd = lineStart + 'const value = 1'.length
    let requestedRange: [string, number, number] | undefined
    const report = Report.build(ReportKind.Error, filename, lineStart)
      .with_message('Invalid declaration')
      .with_label(
        Label.from({
          src: filename,
          range: Range.new(lineStart, lineEnd),
        }).with_message('This declaration is invalid'),
      )
      .with_semantic_token_capability({
        tokenTypes: ['keyword', 'variable', 'number'],
        tokenModifiers: [],
      })
      .with_semantic_token_ranged((requestedFilename, startLine, endLine) => {
        requestedRange = [requestedFilename, startLine, endLine]
        // prettier-ignore
        return [
          1, 0, 5, 0, 0, // const
          0, 6, 5, 1, 0, // value
          0, 8, 1, 2, 0, // 1
        ]
      })
      .finish()

    const ir = report.toIR(
      { id: filename, source: Source.from(source) },
      {
        maxWidth: 80,
        contextLines: 1,
      },
    )

    expect(requestedRange).toEqual([filename, 0, 3])
    const plain = renderPlain(ir)
    expect(plain).toContain('1 │ skip')
    expect(plain).toContain('3 │ skip')
    expect(
      ir.spans.filter((span) => span.semanticToken !== undefined),
    ).toMatchSnapshot()
  })

  it('keeps context lines inside a multiline label', () => {
    const filename = 'example.ts'
    const source = `function main() {
  // context
  throw new Error("hey!")
}`
    const errorStart = source.indexOf('throw')
    const report = Report.build(ReportKind.Error, filename, errorStart)
      .with_message('hey!')
      .with_label(
        Label.from({
          src: filename,
          range: Range.new(0, source.length),
        }),
      )
      .with_label(
        Label.from({
          src: filename,
          range: Range.new(errorStart, errorStart + 'throw'.length),
        }),
      )
      .finish()

    const output = report.render(
      { id: filename, source: Source.from(source) },
      'plain',
      {
        maxWidth: 80,
        contextLines: 1,
      },
    )

    expect(output).toContain('2 │ │     // context')
    expect(output).toContain('4 │ ╰─▶ }')
    expect(output).not.toContain('⋮')
    expect(output).not.toContain('╰───')
    expect(output).toMatchSnapshot()
  })

  it('renders a multiline label and note', () => {
    const source = 'const value = {\n  left: 1,\n  right: "1",\n}\n'
    const leftValue = source.indexOf('1')
    const rightValue = source.indexOf('"1"')
    const output = render(source, (report) =>
      report
        .with_label(
          Label.from({
            src: 'example.ts',
            range: Range.new(14, 43),
          }).with_message(
            'Fields use incompatible types\nCompare left and right values',
          ),
        )
        .with_label(
          Label.from({
            src: 'example.ts',
            range: Range.new(leftValue, leftValue + 1),
          }).with_message('This is a number'),
        )
        .with_label(
          Label.from({
            src: 'example.ts',
            range: Range.new(rightValue, rightValue + 3),
          }).with_message('This is a string'),
        )
        .with_note('Object fields must agree'),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })
})
