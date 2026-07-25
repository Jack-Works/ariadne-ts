import { Display } from './data/Display.js'
import { Range } from './data/Range.js'
import { ColorValue, Color, Fixed } from './lib/Color.js'
import { Config } from './lib/Config.js'
import { Label } from './lib/Label.js'
import { Report } from './lib/Report.js'
import { Source } from './lib/Source.js'
import { OutputBackend } from './ir.js'
import { format } from './write.js'

type ColorName = 'red' | 'green' | 'yellow' | 'blue'

type ColorArg = ColorName | number

type FstringArg = {
  text: string
  color?: ColorArg
}

type Fstring = {
  template: string
  args: FstringArg[]
}

type LabelRange = {
  start: number
  end: number
}

type LabelDef = {
  range: LabelRange
  fstring: string | Fstring
  color?: ColorArg
}

const getColor = (color: ColorArg): ColorValue => {
  switch (color) {
    case 'blue':
    case 'green':
    case 'red':
    case 'yellow': {
      return Color.Named[color]
      break
    }
    default:
      return Fixed(color)
      break
  }
}

const mapFstringArg = (arg: FstringArg) => {
  const rv = new Display(arg.text)
  return arg.color ? rv.fg(getColor(arg.color)) : rv
}

const makeFstring = (fstring: Fstring) => {
  return format(fstring.template, ...fstring.args.map(mapFstringArg))
}

const isString = (s: unknown) => typeof s === 'string'
const mkText = (s: string | Fstring) => (isString(s) ? s : makeFstring(s))
const mkRange = (range: LabelRange) => new Range(range.start, range.end)

export function createDiagnostic(options: {
  sourceId: string
  message: string | Fstring
  offset?: number
  labels: LabelDef[]
  note?: string | Fstring
  tabWidth?: number
  maxWidth: number
  backend?: OutputBackend
  source: string
}) {
  const {
    sourceId,
    message,
    labels,
    offset,
    note,
    source,
    tabWidth,
    maxWidth,
    backend = 'ansi',
  } = options

  let report = Report.build(sourceId, offset ?? 0).with_message(mkText(message))

  labels.forEach((label) => {
    const { fstring, color, range } = label

    const _label = Label.from({
      sourceId,
      range: mkRange(range),
    }).with_message(mkText(fstring))

    if (color) report.add_label(_label.with_color(getColor(color)))
    else report.add_label(_label)
  })

  if (note) report = report.with_note(mkText(note))

  let config = Config.default()

  if (tabWidth) config = config.with_tab_width(tabWidth)
  // .with_cross_gap(false)
  // .with_compact(true)
  // .with_underlines(false)
  // .with_multiline_arrows(false)
  // .with_tab_width(tabWidth))

  return report
    .with_config(config)
    .finish()
    .render({ sourceId, source: Source.from(source) }, backend, {
      maxWidth,
    })
}
