import { isNumber, isString } from '../utils/index.js'
import { Span, SpanInit } from './Span.js'

export class Range extends Span {
  public source(): string {
    return this.SourceId
  }

  public len(): number {
    return Math.abs(this.start - this.end)
  }
  public contains(item: number): boolean {
    return item >= this.start && item < this.end
  }

  static is(o: unknown): o is Range {
    return o instanceof Range
  }

  static from(o: SpanInit): Range {
    if (isNumber(o[0]) && isNumber(o[1])) return new Range(o[0], o[1])

    if (isString(o[0]) && Range.is(o[1])) {
      const s = new Range(o[1].start, o[1].end)
      s.SourceId = o[0]
      return s
    }

    throw new Error(`Invalid SpanInit`)
  }

  static new(start: number, end: number): Range {
    return new Range(start, end)
  }
}
