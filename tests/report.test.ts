import { describe, expect, it } from 'vitest'
import {
  Config,
  defaultHTMLTextColorScheme,
  Fixed,
  Label,
  LabelAttach,
  Range,
  Report,
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
  const sourceId = 'example.ts'
  const report = configure(
    Report.build(sourceId, 0).with_message('Invalid expression'),
  )
    .with_config(Config.default().with_color(color))
    .finish()

  return report.render({ sourceId, source: Source.from(source) }, 'plain', {
    maxWidth: 80,
  })
}

describe('Report', () => {
  it('colors diagnostic severity semantic tokens', () => {
    const ir = {
      version: 1 as const,
      maxWidth: 80,
      spans: [
        {
          text: 'Error',
          semanticToken: { tokenType: 'error', tokenModifiers: [] },
        },
        { text: ' ' },
        {
          text: 'Warning',
          semanticToken: { tokenType: 'warning', tokenModifiers: [] },
        },
        { text: ' ' },
        {
          text: 'Advice',
          semanticToken: { tokenType: 'advice', tokenModifiers: [] },
        },
      ],
    }

    expect(renderAnsi(ir)).toBe(
      '\u001B[31mError\u001B[39m \u001B[33mWarning\u001B[39m \u001B[38;5;147mAdvice\u001B[39m',
    )
    const html = renderHtml(ir)
    expect(html).toContain('data-token-type="error"')
    expect(html).toContain('color: light-dark(#cd3131, #f44747)')
    expect(html).toContain('data-token-type="warning"')
    expect(html).toContain('color: light-dark(#098658, #b5cea8)')
    expect(html).toContain('data-token-type="advice"')
    expect(html).toContain('color: light-dark(#af00db, #c586c0)')
  })

  it('uses only the message for the report header', () => {
    const output = Report.build('example.ts', 0)
      .with_message('Error: Invalid expression')
      .finish()
      .render(
        { sourceId: 'example.ts', source: Source.from('value\n') },
        'plain',
        { maxWidth: 80 },
      )

    expect(output).toMatch(/^Error: Invalid expression\n/)
  })

  it('renders rich text backgrounds', () => {
    const ir = {
      version: 1 as const,
      maxWidth: 80,
      spans: [
        {
          text: 'import',
          background: Fixed(224),
          semanticToken: {
            tokenType: 'keyword',
            tokenModifiers: [],
          },
        },
      ],
    }

    expect(renderPlain(ir)).toMatchSnapshot('plain background')
    expect(renderAnsi(ir)).toMatchSnapshot('ANSI background')
    expect(renderHtml(ir)).toMatchSnapshot('HTML background')
  })

  it('colors diff rich text with the semantic token provider', async () => {
    const sourceId = 'example.ts'
    const source = 'value\n'
    const requestedLanguages: string[] = []
    const report = Report.build(sourceId, 0)
      .with_message('Invalid import')
      .with_label(
        Label.from({
          sourceId,
          range: Range.new(0, 'value'.length),
        }).with_message(
          RichText.from([
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
          ]),
        ),
      )
      .with_semantic_token_capability()
      .with_semantic_token_full((sourceText, language) => {
        requestedLanguages.push(language)
        if (!sourceText.startsWith('import')) return []
        // prettier-ignore
        return sourceText.startsWith('import type')
          ? [
              0, 0, 6, 15, 0, // import
              0, 7, 4, 15, 0, // type
            ]
          : [
              0, 0, 6, 15, 0, // import
            ]
      })
      .finish()

    const ir = report.toIR(
      { sourceId, source: Source.from(source) },
      { maxWidth: 80 },
    )
    const diffSpans = ir.spans.filter((span) => span.background !== undefined)

    expect(diffSpans.length).toBeGreaterThan(0)
    expect(requestedLanguages).toContain('typescript')
    expect(
      diffSpans
        .filter((span) => span.semanticToken?.tokenType === 'keyword')
        .map((span) => span.text),
    ).toEqual(['import', 'type', 'import'])
    expect(renderPlain(ir)).toMatchSnapshot('plain diff')
    expect(renderAnsi(ir)).toMatchSnapshot('ANSI diff')
    await expect(renderHtml(ir)).toMatchFileSnapshot(
      './__snapshots__/report-diff.html',
    )
    expect(diffSpans).toMatchSnapshot()
  })

  it('uses deeper backgrounds for substituted diff text', () => {
    const resolved = RichText.from([
      { diff: 'before', text: 'old', language: 'typescript' },
      { diff: 'after', text: 'new', language: 'typescript' },
    ]).resolveDiff(() => [])

    expect(
      resolved.spans.filter(
        (span) =>
          span.background?.kind === 'ansi256' &&
          (span.background.index === 217 || span.background.index === 157),
      ),
    ).toEqual([
      { text: 'old', background: Fixed(217) },
      { text: 'new', background: Fixed(157) },
    ])
    expect(resolved.spans).toMatchSnapshot()
  })

  it('uses deeper backgrounds for multiline inserted and deleted diff text', () => {
    const resolved = RichText.from([
      { diff: 'before', text: 'start\nremoved line\nshared\nend' },
      { diff: 'after', text: 'start\nshared\ninserted line\nend' },
    ]).resolveDiff(() => [])

    const changedText = (background: number) =>
      resolved.spans
        .filter(
          (span) =>
            span.background?.kind === 'ansi256' &&
            span.background.index === background,
        )
        .map((span) => span.text)
        .join('')

    expect(changedText(217)).toContain('removed line')
    expect(changedText(157)).toContain('inserted line')
    expect(changedText(217)).not.toContain('shared')
    expect(changedText(157)).not.toContain('shared')
  })

  it('wraps annotation text within maxWidth', () => {
    const sourceId = 'example.ts'
    const source = 'const value = 1\n'
    const report = Report.build(sourceId, 0)
      .with_message('A declaration has an incompatible value')
      .with_label(
        Label.from({
          sourceId,
          range: Range.new(0, 'const value'.length),
        }).with_message('This annotation is deliberately long enough to wrap'),
      )
      .with_note('This note also wraps instead of exceeding the layout width')
      .with_config(Config.default().with_label_attach(LabelAttach.Start))
      .finish()

    const output = report.render(
      { sourceId, source: Source.from(source) },
      'plain',
      { maxWidth: 36 },
    )

    expect(
      output
        .trimEnd()
        .split('\n')
        .every((line) => line.length <= 36),
    ).toBe(true)
    expect(output).toContain('╰─ This annotation')
    expect(output).toMatchSnapshot()
  })

  it('renders an inline label', () => {
    const output = render('const answer = false\n', (report) =>
      report.with_label(
        Label.from({
          sourceId: 'example.ts',
          range: Range.new(15, 20),
        }).with_message('Expected a number'),
      ),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })

  it('serializes layout IR and renders every backend', async () => {
    const sourceId = 'sample.tao'
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
    const report = Report.build(sourceId, numberStart)
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
          sourceId,
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
          sourceId,
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
          sourceId,
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
      .with_location_display((displaySourceId, line, column) =>
        RichText.from([
          {
            text: displaySourceId + `:${line}:${column}`,
            link: `https://example.com/source/${displaySourceId}#L${line ?? 1}`,
            semanticToken: 'string',
          },
        ]),
      )
      .with_semantic_token_capability()
      .with_semantic_token_full((requestedSourceText) => {
        fullRequest = requestedSourceText
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
      { sourceId, source: Source.from(source) },
      { maxWidth: 100 },
    )

    expect(fullRequest).toBe(source)
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
    const sourceId = 'example.ts'
    const source = 'skip\nconst value = 1\nskip\n'
    const lineStart = source.indexOf('const')
    const lineEnd = lineStart + 'const value = 1'.length
    let requestedRange: [string, number, number] | undefined
    const report = Report.build(sourceId, lineStart)
      .with_message('Invalid declaration')
      .with_label(
        Label.from({
          sourceId,
          range: Range.new(lineStart, lineEnd),
        }).with_message('This declaration is invalid'),
      )
      .with_semantic_token_capability({
        tokenTypes: ['keyword', 'variable', 'number'],
        tokenModifiers: [],
      })
      .with_semantic_token_ranged(
        (requestedSourceText, language, startLine, endLine) => {
          expect(language).toBe('ts')
          requestedRange = [requestedSourceText, startLine, endLine]
          // prettier-ignore
          return [
            1, 0, 5, 0, 0, // const
            0, 6, 5, 1, 0, // value
            0, 8, 1, 2, 0, // 1
          ]
        },
      )
      .finish()

    const ir = report.toIR(
      { sourceId, source: Source.from(source) },
      {
        maxWidth: 80,
        contextLines: 1,
      },
    )

    expect(requestedRange).toEqual([source, 0, 3])
    const plain = renderPlain(ir)
    expect(plain).toContain('1 │ skip')
    expect(plain).toContain('3 │ skip')
    expect(
      ir.spans.filter((span) => span.semanticToken !== undefined),
    ).toMatchSnapshot()
  })

  it('keeps context lines inside a multiline label', () => {
    const sourceId = 'example.ts'
    const source = `function main() {
  // context
  throw new Error("hey!")
}`
    const errorStart = source.indexOf('throw')
    const report = Report.build(sourceId, errorStart)
      .with_message('hey!')
      .with_label(
        Label.from({
          sourceId,
          range: Range.new(0, source.length),
        }),
      )
      .with_label(
        Label.from({
          sourceId,
          range: Range.new(errorStart, errorStart + 'throw'.length),
        }),
      )
      .finish()

    const output = report.render(
      { sourceId, source: Source.from(source) },
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
            sourceId: 'example.ts',
            range: Range.new(14, 43),
          }).with_message(
            'Fields use incompatible types\nCompare left and right values',
          ),
        )
        .with_label(
          Label.from({
            sourceId: 'example.ts',
            range: Range.new(leftValue, leftValue + 1),
          }).with_message('This is a number'),
        )
        .with_label(
          Label.from({
            sourceId: 'example.ts',
            range: Range.new(rightValue, rightValue + 3),
          }).with_message('This is a string'),
        )
        .with_note('Object fields must agree'),
    )

    expect(output.length).toBeGreaterThan(0)
    expect(output).toMatchSnapshot()
  })
})
