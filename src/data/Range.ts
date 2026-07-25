import { Span, SpanInit } from './Span.js'

export class Range extends Span {
  public source(): string {
    return this.sourceId
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
    const span = Span.from(o)
    const range = new Range(span.start, span.end)
    range.sourceId = span.sourceId
    return range
  }

  static new(start: number, end: number): Range {
    return new Range(start, end)
  }
}
