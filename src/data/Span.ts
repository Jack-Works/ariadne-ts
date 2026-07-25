import { isNumber, isString, range, saturatingSub } from '../utils/index.js'
import { Range } from './Range.js'

export type SpanInit =
  { src: string; range: Range } | { start: number; end: number }

export class Span {
  constructor(
    private _start: number,
    private _end: number,
  ) {}
  /// The identifier used to uniquely refer to a source. In most cases, this is the fully-qualified path of the file.
  public SourceId = ''

  /// Get the identifier of the source that this span refers to.
  source() {
    return this.SourceId
  }

  set start(value: number) {
    this._start = value
  }
  get start(): number {
    return this._start
  }
  set end(value: number) {
    this._end = value
  }
  get end(): number {
    return this._end
  }

  /// Get the length of this span (difference between the start of the span and the end of the span).
  len(): number {
    return saturatingSub(this.end, this.start)
  }

  /// Determine whether the span contains the given offset.
  contains(offset: number): boolean {
    return range(this.start, this.end).includes(offset)
  }

  static is = (o: unknown): o is Span => o instanceof Span

  static from(o: SpanInit) {
    if (typeof o !== 'object' || o === null) {
      throw new Error(`Invalid SpanInit`)
    }
    if ('start' in o && isNumber(o.start) && isNumber(o.end)) {
      return new Span(o.start, o.end)
    }

    if ('src' in o && isString(o.src) && Range.is(o.range)) {
      const s = new Span(o.range.start, o.range.end)
      s.SourceId = o.src
      return s
    }

    throw new Error(`Invalid SpanInit`)
  }
}

export const isSpan = Span.is
