import { Span } from '../data/Span.js'
import { Range } from '../data/Range.js'
import { LabelInfo } from './LabelInfo.js'

export class SourceGroup<S extends Span> {
  constructor(
    public sourceId: string,
    public span: Range,
    public labels: LabelInfo<S>[],
  ) {}
}
