import { Range } from '../data/Range.js'
import { Label } from './Label.js'

/** @internal */
export enum LabelKind {
  Inline = 'Inline',
  Multiline = 'Multiline',
}

/** @internal */
export class LabelInfo<S extends Range> {
  constructor(
    public kind: LabelKind,
    public label: Label<S>,
  ) {}
}
