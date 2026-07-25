import { Display } from '../data/Display.js'
import { none, Option, some } from '../data/Option.js'
import { Range } from '../data/Range.js'
import { Show } from '../data/Show.js'
import { Span } from '../data/Span.js'
import { createIRWriter, Write } from '../data/Write.js'
import { DiagnosticIR, LayoutOptions, OutputBackend, renderIR } from '../ir.js'
import { CharSet, Config, LabelAttach } from '../lib/Config.js'
import {
  bton,
  filterMap,
  isBoolean,
  isNumber,
  max,
  maxNumber,
  min_by_key,
  minNumber,
  range,
  rangeIter,
  saturatingSub,
  sort_by_key,
} from '../utils/index.js'
import { format, write, writeln } from '../write.js'
import { Characters, iCharacters } from './Characters.js'
import { ColorValue } from './Color.js'
import { Label } from './Label.js'
import { LabelInfo, LabelKind } from './LabelInfo.js'
import { ReportBuilder } from './ReportBuilder.js'
import { ReportKind } from './ReportKind.js'
import {
  decodeSemanticTokens,
  DecodedSemanticToken,
  SemanticTokenCapability,
  SemanticTokenProvider,
} from '../semantic_tokens.js'
import { Cache, Source, SourceInput } from './Source.js'
import { SourceGroup } from './SourceGroup.js'
import { LocationDisplay, RichText } from '../rich_text.js'

/// A type representing a diagnostic that is ready to be rendered.
export class Report<S extends Span> {
  constructor(
    public kind: ReportKind,
    public code: Option<string>,
    public msg: Option<RichText>,
    public note: Option<RichText>,
    public help: Option<RichText>,
    public location: [S['sourceId'], number],
    public locationDisplay: LocationDisplay | undefined,
    public labels: Label<S>[],
    public config: Config,
    public semanticTokenCapability?: SemanticTokenCapability,
    public semanticTokenProvider?: SemanticTokenProvider,
  ) {}

  /// Begin building a new [`Report`].
  static build<S extends Span, Id extends string>(
    kind: ReportKind,
    sourceId: Id | null,
    offset: number,
  ): ReportBuilder<S> {
    // TODO
    const builder = new ReportBuilder<S>(
      kind,
      none(),
      none(),
      none(),
      none(),
      [sourceId ?? '', offset],
      undefined,
      [],
      Config.default(),
    )
    return builder
  }

  /// Calculate layout and return a serializable intermediate representation.
  toIR(init: SourceInput, options: LayoutOptions): DiagnosticIR {
    if (!Number.isInteger(options.maxWidth) || options.maxWidth <= 0) {
      throw new Error('maxWidth must be a positive integer')
    }
    const contextLines = options.contextLines ?? 0
    if (!Number.isInteger(contextLines) || contextLines < 0) {
      throw new Error('contextLines must be a non-negative integer')
    }
    const cache = Cache.from(init)
    const writer = createIRWriter()
    this.write(cache, writer, contextLines, options.maxWidth)
    return writer.finish(options.maxWidth)
  }

  /// Calculate layout and render it with the selected output backend.
  render(
    init: SourceInput,
    backend: OutputBackend,
    options: LayoutOptions,
  ): string {
    return renderIR(this.toIR(init, options), backend)
  }

  private get_source_groups(cache: Cache<S['sourceId']>): SourceGroup<S>[] {
    let groups: SourceGroup<S>[] = []
    for (let label of this.labels) {
      let src_display = cache.display(label.span.source())
      let res = cache.fetch(label.span.source())
      if (res.is_err()) {
        throw new Error(
          format("Unable to fetch source '{}': {}", src_display, res.unwrap()),
        )
      }
      let src = res.unwrap()

      if (label.span.start > label.span.end) {
        throw new Error('Label start is after its end')
      }

      let start_line = src
        .get_offset_line(label.span.start)
        .map(([_, l, __]) => l)
      let end_line = src
        .get_offset_line(
          maxNumber(saturatingSub(label.span.end, 1), label.span.start),
        )
        .map(([_, l, __]) => l)

      let label_info = new LabelInfo<S>(
        start_line.equal(end_line) ? LabelKind.Inline : LabelKind.Multiline,
        label,
      )

      const group = groups.find(
        (g: SourceGroup<S>) => g.sourceId === label.span.source(),
      )

      if (group) {
        group.span.start = minNumber(group.span.start, label.span.start)
        group.span.end = maxNumber(group.span.end, label.span.end)
        group.labels.push(label_info)
      } else {
        groups.push(
          new SourceGroup(
            label.span.source(),
            new Range(label.span.start, label.span.end),
            [label_info],
          ),
        )
      }
    }
    return groups
  }

  private getSemanticTokens(
    source: Source,
    sourceId: string,
    startLine: number,
    endLine: number,
  ): Map<number, DecodedSemanticToken[]> {
    if (this.semanticTokenProvider === undefined) return new Map()
    if (this.semanticTokenCapability === undefined) {
      throw new Error(
        'semantic token capability must be configured before a provider',
      )
    }

    const language = sourceLanguage(sourceId)
    const data =
      this.semanticTokenProvider.kind === 'ranged'
        ? this.semanticTokenProvider.provide(
            source.text(),
            language,
            startLine,
            endLine,
          )
        : this.semanticTokenProvider.provide(source.text(), language)
    const tokens = decodeSemanticTokens(
      data,
      this.semanticTokenCapability,
    ).filter((token) => token.line >= startLine && token.line < endLine)
    const byLine = new Map<number, DecodedSemanticToken[]>()

    for (const token of tokens) {
      const line = source.line(token.line)
      if (line.is_none()) {
        throw new Error(`semantic token line ${token.line} is out of bounds`)
      }
      if (token.start + token.length > line.unwrap().chars().length) {
        throw new Error(
          `semantic token at ${token.line}:${token.start} is out of bounds`,
        )
      }
      const lineTokens = byLine.get(token.line) ?? []
      lineTokens.push(token)
      byLine.set(token.line, lineTokens)
    }

    return byLine
  }

  /// Render this diagnostic into an internal string buffer.
  private write<C extends Cache<string>, W extends Write>(
    cache: C,
    w: W,
    contextLines: number,
    maxWidth: number,
  ): void {
    const draw: iCharacters =
      this.config.char_set === CharSet.Unicode
        ? Characters.unicode()
        : Characters.ascii()

    // --- Header ---

    const code = this.code.map_or('', (value) => format('[E{}] ', value))
    let id = format('{}{}:', code, this.kind)
    const kind_color =
      this.kind === ReportKind.Error
        ? this.config.error_color()
        : this.kind === ReportKind.Warning
          ? this.config.warning_color()
          : this.kind === ReportKind.Advice
            ? this.config.advice_color()
            : none<ColorValue>()

    const headerLines = this.msg
      .map((message) =>
        this.resolveRichText(message).wrap(
          Math.max(1, maxWidth - id.length - 1),
        ),
      )
      .unwrap_or_else(() => [RichText.from('')])
    for (const [index, messageLine] of headerLines.entries()) {
      if (index === 0) {
        writeln(w, '{} {}', new Display(id).fg(kind_color), messageLine)
      } else {
        writeln(w, '{}{}', new Show([' ', id.length + 1]), messageLine)
      }
    }

    let groups = this.get_source_groups(cache)

    // Line number maximum width
    let filtered_groups = filterMap(
      groups,
      ({ span, sourceId }: SourceGroup<S>) => {
        let sourceName: string = cache
          .display(sourceId)!
          .map((d) => d.toString())
          .unwrap_or_else(() => '<unknown>')

        let res = cache.fetch(sourceId)

        if (res.is_err()) {
          throw new Error(
            format('Unable to fetch source {}: {}', sourceName, res.unwrap()),
          )
        }
        let src = res.unwrap()

        let line_range = this.lineRangeWithContext(src, span, contextLines)

        let iter = rangeIter(1, Infinity)
        iter = map(iter, (x) => Math.pow(10, x))
        iter = take_while(iter, (x) => {
          const d = Math.floor(line_range.end / x)
          return d !== 0
        })
        const cnt = count(iter)
        return cnt + 1
      },
    )

    let line_no_width = max(filtered_groups) ?? 0

    // --- Source sections ---
    let groups_len = groups.length
    for (let [group_idx, { sourceId, span, labels }] of groups.entries()) {
      let sourceName = cache
        .display(sourceId)
        .map((d) => d.toString())
        .unwrap_or_else(() => '<unknown>')

      let res = cache.fetch(sourceId)

      if (res.is_err()) {
        throw new Error(
          format('Unable to fetch source {}: {}', sourceName, res.unwrap()),
        )
      }

      let src = res.unwrap()

      const labelLineRange = src.get_line_range(span)
      let line_range = this.lineRangeWithContext(src, span, contextLines)
      const semanticTokens = this.getSemanticTokens(
        src,
        sourceId,
        line_range.start,
        line_range.end,
      )

      // File name & reference
      let location =
        sourceId === this.location[0]
          ? this.location[1]
          : labels[0].label.span.start

      let [line_no, col_no] = src
        .get_offset_line(location)
        .map<[number | null, number | null]>(([_, idx, col]) => [
          idx + 1,
          col + 1,
        ])
        .unwrap_or_else(() => [null, null])
      const locationLine = line_no === null ? null : line_no - 1

      const displayedLocation = RichText.from(
        this.locationDisplay?.(sourceName, line_no, col_no) ??
          `${sourceName}:${line_no ?? '?'}:${col_no ?? '?'}`,
      )
      writeln(
        w,
        '{}{}{}{}{}{}',
        new Show([' ', line_no_width + 2]),
        new Display(group_idx === 0 ? draw.ltop : draw.lcross).fg(
          this.config.margin_color(),
        ),
        new Display(draw.hbar).fg(this.config.margin_color()),
        new Display(draw.lbox).fg(this.config.margin_color()),
        displayedLocation,
        new Display(draw.rbox).fg(this.config.margin_color()),
      )

      if (!this.config.compact) {
        writeln(
          w,
          '{}{}',
          new Show([' ', line_no_width + 2]),
          new Display(draw.vbar).fg(this.config.margin_color()),
        )
      }

      class LineLabel<S extends Span> {
        constructor(
          public col: number,
          public label: Label<S>,
          public multi: boolean,
          public draw_msg: boolean,
        ) {
          this.col = Math.floor(col)
        }
      }

      // Generate a list of multi-line labels
      let multi_labels: Label<S>[] = []
      for (let label_info of labels) {
        if (label_info.kind === LabelKind.Multiline) {
          multi_labels.push(label_info.label)
        }
      }

      // Sort multiline labels by length
      multi_labels.sort((a, b) => b.span.len() - a.span.len())

      //#region [ rgba(0, 20, 0, 0.3) ] Write_Margin
      let write_margin = (
        w: W,
        idx: number,
        is_line: boolean,
        is_ellipsis: boolean,
        draw_labels: boolean,
        report_row: Option<[number, boolean]>,
        line_labels: Array<LineLabel<S>>,
        margin_label: Option<LineLabel<S>>,
      ): void => {
        let line_no_margin: string

        if (is_line && !is_ellipsis) {
          let line_no = format('{}', idx + 1)
          line_no_margin = format(
            '{}{} {}',
            new Show([' ', line_no_width - line_no.length]),
            line_no,
            draw.vbar,
          )
        } else {
          line_no_margin = format(
            '{}{}',
            new Show([' ', line_no_width + 1]),
            is_ellipsis ? draw.vbar_gap : draw.vbar_break,
          )
        }

        write(
          w,
          ' {}{}',
          new Display(line_no_margin).fg(this.config.margin_color()),
          new Show(some(' ').filter(() => !this.config.compact)),
        )

        // Multi-line margins
        if (draw_labels) {
          for (let col of range(
            0,
            multi_labels.length + bton(multi_labels.length > 0),
          )) {
            let corner: Option<[Label<S>, boolean]> = none()
            let hbar: Option<Label<S>> = none()
            let vbar: Option<Label<S>> = none()
            let margin_ptr: Option<[LineLabel<S>, boolean]> = none()

            let multi_label = Option.from(multi_labels[col])
            let line_span = src.line(idx).unwrap().span()

            for (let [i, label] of multi_labels
              .slice(0, minNumber(col + 1, multi_labels.length))
              .entries()) {
              let margin = margin_label.filter((m) => label === m.label)

              if (
                label.span.start <= line_span.end &&
                label.span.end > line_span.start
              ) {
                let is_parent = i !== col
                let is_start = line_span.contains(label.span.start)
                let is_end = line_span.contains(label.last_offset())

                if (margin.filter(() => is_line).is_some()) {
                  let _margin = margin.filter(() => is_line)
                  margin_ptr = some([_margin.unwrap(), is_start])
                } else if (!is_start && (!is_end || is_line)) {
                  vbar = vbar.or(some(label).filter(() => !is_parent))
                } else {
                  if (
                    report_row.is_some() &&
                    report_row.map_or(
                      false,
                      (o) => isNumber(o[0]) && isBoolean(o[1]),
                    )
                  ) {
                    let [_report_row, is_arrow] = report_row.unwrap()

                    const label_row = Math.max(
                      0,
                      line_labels.findIndex((lineLabel) => {
                        return label === lineLabel.label
                      }),
                    )

                    if (_report_row === label_row) {
                      if (margin.is_some()) {
                        vbar = some(margin.unwrap().label).filter(
                          () => col === i,
                        )
                        if (is_start) {
                          continue
                        }
                      }

                      if (is_arrow) {
                        hbar = some(label)
                        if (!is_parent) {
                          corner = some([label, is_start])
                        }
                      } else if (!is_start) {
                        vbar = vbar.or(some(label).filter(() => !is_parent))
                      }
                    } else {
                      vbar = vbar.or(
                        some(label).filter(
                          () =>
                            !is_parent &&
                            !!(bton(is_start) ^ bton(_report_row < label_row)),
                        ),
                      )
                    }
                  }
                }
              }
            }

            if (
              margin_ptr.is_some() &&
              margin_ptr.map_or(
                false,
                (o) => Label.is(o[0]) && isBoolean(o[1]),
              ) &&
              is_line
            ) {
              let [margin, _is_start] = margin_ptr.unwrap()
              if (_is_start) {
                let is_col = multi_label.map_or(
                  false,
                  (ml) => ml === margin.label,
                )
                let is_limit = col + 1 === multi_labels.length
                if (!is_col && !is_limit) {
                  hbar = hbar.or(some(margin.label))
                }
              }
            }

            hbar = hbar.filter(
              (l) =>
                margin_label.map_or(true, (margin) => margin.label !== l) ||
                !is_line,
            )

            const getCorners = (): [Display, Display] => {
              if (
                corner.is_some() &&
                Array.isArray(corner.unwrap()) &&
                Label.is(corner.unwrap()[0]) &&
                isBoolean(corner.unwrap()[1])
              ) {
                let [label, is_start] = corner.unwrap()
                return [
                  new Display(is_start ? draw.ltop : draw.lbot).fg(label.color),
                  new Display(draw.hbar).fg(label.color),
                ]
              } else if (
                hbar
                  .filter(() => vbar.is_some() && !this.config.cross_gap)
                  .is_some()
              ) {
                let label: Label<S> = hbar
                  .filter(() => vbar.is_some() && !this.config.cross_gap)
                  .unwrap()
                return [
                  new Display(draw.xbar).fg(label.color),
                  new Display(draw.hbar).fg(label.color),
                ]
              } else if (hbar.is_some()) {
                let label: Label<S> = hbar.unwrap()
                const d = new Display(draw.hbar).fg(label.color)
                return [d, d]
              } else if (vbar.is_some()) {
                let label: Label<S> = vbar.unwrap()
                let vb = new Display(is_ellipsis ? draw.vbar_gap : draw.vbar)
                return [vb.fg(label.color), new Display(' ').fg(none())]
              } else if (margin_ptr.is_some() && is_line) {
                let [margin, is_start] = margin_ptr.unwrap()
                let is_col = multi_label.map_or(
                  false,
                  (ml) => ml === margin.label,
                )
                let is_limit = col === multi_labels.length
                const continuesBelow = line_labels.some(
                  (lineLabel) => lineLabel.label === margin.label,
                )
                return [
                  new Display(
                    is_limit
                      ? draw.rarrow
                      : is_col
                        ? is_start
                          ? draw.ltop
                          : continuesBelow
                            ? draw.lcross
                            : draw.lbot
                        : draw.hbar,
                  ).fg(margin.label.color),

                  new Display(!is_limit ? draw.hbar : ' ').fg(
                    margin.label.color,
                  ),
                ]
              } else {
                const d = new Display(' ').fg(none())
                return [d, d]
              }
            }

            let [a, b] = getCorners()

            write(w, '{}', a)
            if (!this.config.compact) {
              write(w, '{}', b)
            }
          }
        }
      }
      // #endregion

      //#region [ rgba(0, 0, 0, 0.3) ] Body
      let is_ellipsis = false
      for (let idx of range(line_range.start, line_range.end)) {
        if (src.line(idx).is_none()) {
          continue
        }

        let line = src.line(idx).unwrap()

        const f_labels = filterMap(multi_labels, (label) => {
          let is_start = line.span().contains(label.span.start)
          let is_end = line.span().contains(label.last_offset())
          if (is_start) {
            // TODO: Check to see whether multi is the first on the start line or first on the end line
            return new LineLabel(
              label.span.start - line.offset(),
              label,
              true,
              false,
            )
          } else if (is_end) {
            return new LineLabel(
              label.last_offset() - line.offset(),
              label,
              true,
              true,
            )
          } else {
            return null
          }
        })

        let margin_label = min_by_key(f_labels, (ll) => ll.col)
        // .min_by_key(ll => [ll.col, !ll.label.span.start]));

        // Generate a list of labels for this line, along with their label columns
        let line_labels = filterMap(multi_labels, (label) => {
          let is_start = line.span().contains(label.span.start)
          let is_end = line.span().contains(label.last_offset())
          if (is_start && margin_label.map_or(true, (m) => label !== m.label)) {
            // TODO: Check to see whether multi is the first on the start line or first on the end line
            return new LineLabel(
              label.span.start - line.offset(),
              label,
              true,
              false, // Multi-line spans don;t have their messages drawn at the start
            )
          } else if (
            is_end &&
            (label.msg.is_some() ||
              margin_label.map_or(true, (margin) => label !== margin.label))
          ) {
            return new LineLabel(
              label.last_offset() - line.offset(),
              label,
              true,
              true, // Multi-line spans have their messages drawn at the end
            )
          } else {
            return null
          }
        })

        for (let label_info of labels.filter(
          (l) =>
            l.label.span.start >= line.span().start &&
            l.label.span.end <= line.span().end,
        )) {
          if (label_info.kind === LabelKind.Inline) {
            const col =
              this.config.label_attach === LabelAttach.Start
                ? minNumber(
                    label_info.label.span.start + 1,
                    label_info.label.last_offset(),
                  )
                : this.config.label_attach === LabelAttach.End
                  ? label_info.label.last_offset()
                  : (label_info.label.span.start + label_info.label.span.end) /
                    2

            line_labels.push(
              new LineLabel(
                maxNumber(col, label_info.label.span.start) - line.offset(),
                label_info.label,
                false,
                true,
              ),
            )
          }
        }

        // Skip this line if we don't have labels for it
        if (line_labels.length === 0 && margin_label.is_none()) {
          const isContextLine =
            idx < labelLineRange.start ||
            idx >= labelLineRange.end ||
            (locationLine !== null &&
              idx >= locationLine - contextLines &&
              idx <= locationLine + contextLines)
          if (isContextLine) {
            is_ellipsis = false
          } else {
            let within_label = multi_labels.some((label) =>
              label.span.contains(line.span().start),
            )
            if (!is_ellipsis && within_label) {
              is_ellipsis = true
            } else {
              if (!this.config.compact && !is_ellipsis) {
                write_margin(
                  w,
                  idx,
                  false,
                  is_ellipsis,
                  false,
                  none(),
                  [],
                  none(),
                )
                write(w, '\n')
              }
              is_ellipsis = true
              continue
            }
          }
        } else {
          is_ellipsis = false
        }

        // Sort the labels by their columns
        sort_by_key(line_labels, (ll) => ll.label.order)
        sort_by_key(line_labels, (ll) => ll.col)
        sort_by_key(line_labels, (ll) => bton(!ll.label.span.start))

        // Determine label bounds so we know where to put error messages
        let arrow_end_space = this.config.compact ? 1 : 2
        let arrow_len =
          line_labels.reduce((l, ll) => {
            return ll.multi
              ? line.len()
              : maxNumber(l, saturatingSub(ll.label.span.end, line.offset()))
          }, 0) + arrow_end_space
        const annotationMarginWidth =
          line_no_width +
          4 +
          (multi_labels.length > 0 ? (multi_labels.length + 1) * 2 : 0)

        // Should we draw a vertical bar as part of a label arrow on this line?
        let get_vbar = (col: number, row: number): Option<LineLabel<S>> =>
          Option.from(
            Array.from(line_labels.entries())
              // Only labels with notes get an arrow
              .filter(
                ([_, ll]) =>
                  ll.label.msg.is_some() &&
                  margin_label.map_or(true, (m) => ll.label !== m.label),
              )
              .find(
                ([j, ll]) =>
                  ll.col === col &&
                  ((row <= j && !ll.multi) || (row <= j && ll.multi)),
              ),
          ).map(([_, ll]) => ll)

        let get_highlight = (col: number): Option<Label<S>> =>
          min_by_key(
            [
              ...margin_label.iter().map((ll) => ll.label),
              ...multi_labels,
              ...line_labels.map((l) => l.label),
            ].filter((l) => l.span.contains(line.offset() + col)),
            // Prioritise displaying smaller spans
            // .min_by_key(l => l.span.len()));
            (l) => -l.priority + l.span.len(),
          )
        // l => l.span.len());
        // l => -l.priority);

        let get_underline = (col: number): Option<LineLabel<S>> =>
          min_by_key(
            line_labels.filter((ll) => {
              return (
                this.config.underlines &&
                // Underlines only occur for inline spans (highlighting can occur for all spans)
                !ll.multi &&
                ll.label.span.contains(line.offset() + col)
              )
            }),
            // Prioritise displaying smaller spans
            // .min_by_key(ll => [-ll.label.priority, ll.label.span.len()]);
            // .min_by_key(ll => ll.label.span.len()));
            // ll => -ll.label.priority + ll.label.span.len());
            (ll) => ll.label.span.len(),
          )
        // ll => -ll.label.priority);

        // Margin
        write_margin(
          w,
          idx,
          true,
          is_ellipsis,
          true,
          none(),
          line_labels,
          margin_label,
        )

        // Line
        if (!is_ellipsis) {
          const lineSemanticTokens = semanticTokens.get(idx) ?? []
          for (let [col, _c] of line.chars().split('').entries()) {
            let highlight = get_highlight(col)
            let color = highlight.is_some()
              ? highlight.unwrap().color
              : this.config.unimportant_color()
            let [c, width] = this.config.char_width(_c, col)
            const semanticToken = lineSemanticTokens.find(
              (token) => col >= token.start && col < token.start + token.length,
            )
            const renderedSemanticToken =
              semanticToken === undefined
                ? undefined
                : {
                    tokenType: semanticToken.tokenType,
                    tokenModifiers:
                      highlight.is_none() &&
                      !semanticToken.tokenModifiers.includes('unquoted')
                        ? [...semanticToken.tokenModifiers, 'unquoted']
                        : semanticToken.tokenModifiers,
                  }
            for (let _ of range(0, width)) {
              write(
                w,
                '{}',
                new Display(c)
                  .fg(color)
                  .withSemanticToken(renderedSemanticToken),
              )
            }
          }
        }
        write(w, '\n')

        // Arrows !!!
        for (let row of range(0, line_labels.length)) {
          let line_label = line_labels[row]
          const messageArrowLength =
            line_label.draw_msg && line_label.label.msg.is_some()
              ? Math.min(arrow_len, Math.ceil(line_label.col) + arrow_end_space)
              : arrow_len

          if (!this.config.compact) {
            // Margin alternate
            write_margin(
              w,
              idx,
              false,
              is_ellipsis,
              true,
              some([row, false]),
              line_labels,
              margin_label,
            )
            // Lines alternate
            let chars = line.chars()

            let { next } = makeIter(chars)

            for (let col of range(0, arrow_len)) {
              let width = next().map_or(
                1,
                (c) => this.config.char_width(c, col)[1],
              )

              let vbar = get_vbar(col, row)
              let underline = get_underline(col).filter(() => row === 0)

              const getCTailOuter = () => {
                if (vbar.is_some()) {
                  let vbar_ll = vbar.unwrap()

                  const getCTailInner = () => {
                    if (underline.is_some()) {
                      // TODO: Is this good?
                      if (vbar_ll.label.span.len() <= 1) {
                        return [draw.underbar, draw.underline]
                      } else if (
                        line.offset() + col ===
                        vbar_ll.label.span.start
                      ) {
                        return [draw.ltop, draw.underbar]
                      } else if (
                        line.offset() + col ===
                        vbar_ll.label.last_offset()
                      ) {
                        return [draw.rtop, draw.underbar]
                      } else {
                        return [draw.underbar, draw.underline]
                      }
                    } else if (
                      vbar_ll.multi &&
                      row === 0 &&
                      this.config.multiline_arrows
                    ) {
                      return [draw.uarrow, new Display(' ')]
                    } else {
                      return [draw.vbar, new Display(' ')]
                    }
                  }

                  let [c, tail] = getCTailInner()
                  return [
                    new Display(c).fg(vbar_ll.label.color),
                    new Display(tail).fg(vbar_ll.label.color),
                  ]
                } else if (underline.is_some()) {
                  let underline_ll = underline.unwrap()
                  return [
                    new Display(draw.underline).fg(underline_ll.label.color),
                    new Display(draw.underline).fg(underline_ll.label.color),
                  ]
                } else {
                  return [
                    new Display(' ').fg(none()),
                    new Display(' ').fg(none()),
                  ]
                }
              }

              let [c, tail] = getCTailOuter()
              for (let i of range(0, width)) {
                write(w, '{}', i === 0 ? c : tail)
              }
            }
            write(w, '\n')
          }

          // Margin
          write_margin(
            w,
            idx,
            false,
            is_ellipsis,
            true,
            some([row, true]),
            line_labels,
            margin_label,
          )
          // Lines
          let chars = line.chars()
          let { next } = makeIter(chars)

          for (let col of range(0, messageArrowLength)) {
            let n = next()
            let width = n.map_or(1, (c) => this.config.char_width(c, col)[1])

            let is_hbar =
              ((col > line_label.col ? 1 : 0) ^ (line_label.multi ? 1 : 0) ||
                (line_label.label.msg.is_some() &&
                  line_label.draw_msg &&
                  col > line_label.col)) &&
              line_label.label.msg.is_some()

            const getctail = (): [Display, Display] => {
              if (
                col === line_label.col &&
                line_label.label.msg.is_some() &&
                margin_label.map_or(true, (m) => line_label.label != m.label)
              ) {
                return [
                  new Display(
                    line_label.multi
                      ? line_label.draw_msg
                        ? draw.mbot
                        : draw.rbot
                      : draw.lbot,
                  ).fg(line_label.label.color),

                  new Display(draw.hbar).fg(line_label.label.color),
                ]
              } else if (
                get_vbar(col, row)
                  .filter(
                    () =>
                      col != line_label.col || line_label.label.msg.is_some(),
                  )
                  .is_some()
              ) {
                let vbar_ll = get_vbar(col, row)
                  .filter(
                    () =>
                      col != line_label.col || line_label.label.msg.is_some(),
                  )
                  .unwrap()
                if (!this.config.cross_gap && is_hbar) {
                  return [
                    new Display(draw.xbar).fg(line_label.label.color),
                    new Display(' ').fg(line_label.label.color),
                  ]
                } else if (is_hbar) {
                  let d = new Display(draw.hbar).fg(line_label.label.color)
                  return [d, d]
                } else {
                  return [
                    new Display(
                      vbar_ll.multi && row === 0 && this.config.compact
                        ? draw.uarrow
                        : draw.vbar,
                    ).fg(vbar_ll.label.color),

                    new Display(' ').fg(line_label.label.color),
                  ]
                }
              } else if (is_hbar) {
                let d = new Display(draw.hbar).fg(line_label.label.color)
                return [d, d]
              } else {
                let d = new Display(' ').fg(none())
                return [d, d]
              }
            }

            let [c, tail] = getctail()

            if (width > 0) {
              write(w, '{}', c)
            }
            for (let _ of range(1, width)) {
              write(w, '{}', tail)
            }
          }
          if (line_label.draw_msg) {
            const messageLines = line_label.label.msg
              .map((message) =>
                this.resolveRichText(message).wrap(
                  Math.max(
                    1,
                    maxWidth - annotationMarginWidth - messageArrowLength - 1,
                  ),
                ),
              )
              .unwrap_or_else(() => [])
            for (const [
              messageLineIndex,
              messageLine,
            ] of messageLines.entries()) {
              if (messageLineIndex > 0) {
                write(w, '\n')
                write_margin(
                  w,
                  idx,
                  false,
                  is_ellipsis,
                  true,
                  none(),
                  line_labels,
                  margin_label,
                )
                write(w, '{}', new Show([' ', messageArrowLength]))
              }
              write(w, ' {}', messageLine)
            }
          }

          write(w, '\n')
        }
      }
      //#endregion

      let is_final_group = group_idx + 1 === groups_len
      const finalMessageMarginWidth =
        line_no_width +
        4 +
        (multi_labels.length > 0 ? (multi_labels.length + 1) * 2 : 0)
      const writeFinalMessage = (title: string, message: RichText): void => {
        const prefixWidth = title.length + 2
        const lines = this.resolveRichText(message).wrap(
          Math.max(1, maxWidth - finalMessageMarginWidth - prefixWidth),
        )
        for (const [index, messageLine] of lines.entries()) {
          write_margin(w, 0, false, false, true, some([0, false]), [], none())
          if (index === 0) {
            write(
              w,
              '{}: {}\n',
              new Display(title).fg(this.config.note_color()),
              messageLine,
            )
          } else {
            write(w, '{}{}\n', new Show([' ', prefixWidth]), messageLine)
          }
        }
      }

      // Help
      if (this.help.is_some() && is_final_group) {
        let note = this.help.unwrap()
        if (!this.config.compact) {
          write_margin(w, 0, false, false, true, some([0, false]), [], none())
          write(w, '\n')
        }
        writeFinalMessage('Help', note)
      }

      // Note
      if (this.note.is_some() && is_final_group) {
        let note = this.note.unwrap()
        if (!this.config.compact) {
          write_margin(w, 0, false, false, true, some([0, false]), [], none())
          write(w, '\n')
        }
        writeFinalMessage('Note', note)
      }

      // Tail of report
      if (!this.config.compact) {
        if (is_final_group) {
          let final_margin = format(
            '{}{}',
            new Show([draw.hbar, line_no_width + 2]),
            draw.rbot,
          )
          writeln(
            w,
            '{}',
            new Display(final_margin).fg(this.config.margin_color()),
          )
        } else {
          writeln(
            w,
            '{}{}',
            new Show([' ', line_no_width + 2]),
            new Display(draw.vbar).fg(this.config.margin_color()),
          )
        }
      }
    }

    if (groups_len === 0) {
      // Help
      if (this.help.is_some()) {
        let note = this.help.unwrap()
        if (!this.config.compact) {
          write(w, '\n')
        }
        const lines = this.resolveRichText(note).wrap(Math.max(1, maxWidth - 6))
        for (const [index, line] of lines.entries()) {
          write(
            w,
            index === 0 ? '{}: {}\n' : '{}{}\n',
            index === 0
              ? new Display('Help').fg(this.config.note_color())
              : new Show([' ', 6]),
            line,
          )
        }
      }

      // Note
      if (this.note.is_some()) {
        let note = this.note.unwrap()
        if (!this.config.compact) {
          write(w, '\n')
        }
        const lines = this.resolveRichText(note).wrap(Math.max(1, maxWidth - 6))
        for (const [index, line] of lines.entries()) {
          write(
            w,
            index === 0 ? '{}: {}\n' : '{}{}\n',
            index === 0
              ? new Display('Note').fg(this.config.note_color())
              : new Show([' ', 6]),
            line,
          )
        }
      }
    }
  }

  private lineRangeWithContext(
    source: Source,
    span: Span,
    contextLines: number,
  ): Range {
    const range = source.get_line_range(span)
    return new Range(
      Math.max(0, range.start - contextLines),
      Math.min(source.lines().length, range.end + contextLines),
    )
  }

  private resolveRichText(message: RichText): RichText {
    const provider = this.semanticTokenProvider
    const capability = this.semanticTokenCapability
    if (provider === undefined || capability === undefined) {
      return message.resolveDiff(() => [])
    }
    return message.resolveDiff((sourceText, language) => {
      const data =
        provider.kind === 'ranged'
          ? provider.provide(
              sourceText,
              language,
              0,
              sourceText.split('\n').length,
            )
          : provider.provide(sourceText, language)
      return decodeSemanticTokens(data, capability)
    })
  }
}

function sourceLanguage(sourceId: string): string {
  const filename = sourceId.split(/[\\/]/).at(-1) ?? sourceId
  const extension = filename.lastIndexOf('.')
  return extension < 0 ? '' : filename.slice(extension + 1)
}

function* map<a, b>(a: Iterator<a>, f: (a: a) => b) {
  let value = a.next()
  while (value.done === false) {
    yield f(value.value)
    value = a.next()
  }
}

function* take_while<a>(a: Iterator<a>, p: (a: a) => boolean) {
  let current = a.next()
  while (current.done === false) {
    if (p(current.value)) yield current.value
    else break
    current = a.next()
  }
}

function to_array<a>(a: Iterator<a>) {
  let result: a[] = []
  let current = a.next()
  while (current.done === false) {
    result.push(current.value)
    current = a.next()
  }
  return result
}

function count<a>(a: Iterator<a>) {
  return to_array(a).length
}

function makeIter<T extends readonly string[] | string>(arr: T) {
  let cursor = 0
  let next = (): Option<string> => {
    const res = arr[cursor++]
    if (res === undefined) return none()
    return some(res)
  }

  return { next, cursor }
}
