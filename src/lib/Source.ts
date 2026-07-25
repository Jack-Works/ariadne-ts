import { Display } from '../data/Display.js'
import { none, Option, some } from '../data/Option.js'
import { err, ok, Result } from '../data/Result.js'
import { Span } from '../data/Span.js'
import { Range } from '../data/Range.js'
import {
  binary_search_by_key,
  maxNumber,
  saturatingSub,
} from '../utils/index.js'
import { Displayable, format } from '../write.js'

export type ErrMsg = string

export interface SourceEntry {
  sourceId: string
  source: Source
}

export type SourceInput = SourceEntry | Source | FnCache<string>

/// A trait implemented by [`Source`] caches.
export abstract class Cache<Id> {
  /// Fetch the [`Source`] identified by the given ID, if possible.
  abstract fetch(sourceId: Id): Result<Source, ErrMsg>

  /// Display the given ID. as a single inline value.
  ///
  /// This function may make use of attributes from the [`Fmt`] trait.
  abstract display(sourceId: Id): Option<Displayable>

  static from(init: SourceInput): Cache<string> {
    if (Source.is(init)) return init
    if (FnCache.is(init)) return init
    return new IdSource(init)
  }
}

/// A type representing a single line of a [`Source`].
class Line {
  constructor(
    private _offset: number,
    private _len: number,
    private _chars: string,
  ) {}
  /// Get the offset of this line in the original [`Source`] (i.e: the number of characters that precede it).
  offset(): number {
    return this._offset
  }

  /// Get the character length of this line.
  len(): number {
    return this._len
  }

  /// Get the offset span of this line in the original [`Source`].
  span(): Range {
    return new Range(this.offset(), this.offset() + this.len())
  }

  /// Return an iterator over the characters in the line, excluding trailing whitespace.
  chars(): string {
    return this._chars
  }
}

/// A type representing a single source that may be referred to by [`Span`]s.
///
/// In most cases, a source is a single input file.
export class Source implements Cache<string> {
  constructor(
    private _lines: Line[],
    private _len: number,
    private _text: string,
  ) {}

  /// Generate a [`Source`] from the given [`str`].
  ///
  /// Note that this function can be expensive for long strings. Use an implementor of [`Cache`] where possible.
  static from(s: string): Source {
    let offset = 0
    const lines = s
      .split('\n') // TODO: Handle non-\n newlines
      .map((line) => {
        let l = new Line(
          offset,
          line.length + 1, // line.chars().count() + 1,
          line.trimEnd(),
        )
        offset += l.len()
        return l
      })

    return new Source(lines, offset, s)
  }
  /// Get the length of the total number of characters in the source.
  len(): number {
    return this._len
  }

  /// Return an iterator over the characters in the source.
  chars(): string {
    return this.lines()
      .map((l) => l.chars())
      .join('\n')
  }
  text(): string {
    return this._text
  }

  /// Get access to a specific, zero-indexed [`Line`].
  line(idx: number): Option<Line> {
    const line = this.lines()[idx]
    return line === undefined ? none() : some(line)
  }

  /// Return an iterator over the [`Line`]s in this source.
  lines(): Line[] {
    return this._lines
  }

  /// Get the line that the given offset appears on, and the line/column numbers of the offset.
  ///
  /// Note that the line/column numbers are zero-indexed.
  get_offset_line(offset: number): Option<[Line, number, number]> {
    if (offset <= this.len()) {
      let idx = binary_search_by_key(
        this.lines(),
        offset,
        (line) => line.offset() - 1,
      ).unwrap_or_else((idx) => Math.max(0, idx - 1))
      let line = this.lines()[idx]
      const fstring = format(
        'offset = {}, line.offset = {}, idx = {}',
        offset,
        line?.offset() ?? Infinity,
        idx,
      )
      if (!line || offset < line.offset()) {
        throw new Error(fstring)
      }
      const os = line.offset()
      return some([line, idx, offset - os])
    } else {
      return none()
    }
  }

  /// Get the range of lines that this span runs across.
  ///
  /// The resulting range is guaranteed to contain valid line indices (i.e: those that can be used for
  /// [`Source::line`]).
  get_line_range(span: Span): Range {
    let start = this.get_offset_line(span.start).map_or(0, ([_, l, __]) => l)
    let end = this.get_offset_line(
      maxNumber(saturatingSub(span.end, 1), span.start),
    ).map_or(this.lines().length, ([_, l, __]) => l + 1)
    // start..end
    return new Range(start, end)
  }

  fetch(_id: string): Result<Source, ErrMsg> {
    return ok(this)
  }
  display(_id: string): Option<Displayable> {
    return none()
  }

  static is(other: unknown): other is Source {
    return other instanceof Source
  }
}

export class IdSource extends Source {
  constructor(public data: SourceEntry) {
    super(data.source.lines(), data.source.len(), data.source.text())
  }
  fetch(sourceId: string): Result<Source, ErrMsg> {
    return sourceId === this.data.sourceId
      ? ok(this.data.source)
      : err(format("Failed to fetch source '{}'", sourceId))
  }
  display(sourceId: string): Option<Display> {
    return some(new Display(sourceId))
  }
}

/// A [`Cache`] that fetches [`Source`]s using the provided function.
export class FnCache<Id> implements Cache<Id> {
  constructor(
    public sources: Map<Id, Source>,
    public get: (sourceId: Id) => string,
  ) {}

  /// Create a new [`FnCache`] with the given fetch function.
  static new<Id>(get: (sourceId: Id) => string): FnCache<Id> {
    return new FnCache<Id>(new Map() /* HashMap::default() */, get)
  }

  /// Pre-insert a selection of [`Source`]s into this cache.
  with_sources(sources: Array<{ sourceId: Id; source: Source }>): this {
    // this.sources.reserve(sources.length);
    for (const { sourceId, source } of sources) {
      this.sources.set(sourceId, source)
    }
    return this
  }
  fetch(sourceId: Id): Result<Source, ErrMsg> {
    const entry = this.sources.get(sourceId)
    if (entry !== undefined) return ok(entry)

    const source = Source.from(this.get(sourceId))
    this.sources.set(sourceId, source)
    return ok(source)
  }
  display(sourceId: Id): Option<Displayable> {
    return some(String(sourceId))
  }

  static is(other: unknown): other is FnCache<string> {
    return other instanceof FnCache
  }
}

/// Create a [`Cache`] from a collection of ID/strings, where each corresponds to a [`Source`].
export function sources<
  Id extends string,
  I extends Array<{ sourceId: Id; source: string }>,
>(iter: I): FnCache<Id> {
  return FnCache.new((sourceId: Id) =>
    format("Failed to fetch source '{}'", sourceId),
  ).with_sources(
    iter.map(({ sourceId, source }) => ({
      sourceId,
      source: Source.from(source),
    })),
  )
}
