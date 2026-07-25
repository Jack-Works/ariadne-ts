import { Option, some } from '../data/Option.js'
import { Span } from '../data/Span.js'
import {
  SemanticTokenCapability,
  SemanticTokenProvider,
  semanticTokenModifiers,
  semanticTokenTypes,
  validateSemanticTokenCapability,
} from '../semantic_tokens.js'
import { Config } from './Config.js'
import { Label } from './Label.js'
import { Report } from './Report.js'
import { ReportKind } from './ReportKind.js'
import { LocationDisplay, RichText, RichTextInput } from '../rich_text.js'

/// A type used to build a [`Report`].

export class ReportBuilder<S extends Span> {
  constructor(
    private kind: ReportKind,
    private code: Option<string>,
    private msg: Option<RichText>,
    private note: Option<RichText>,
    private help: Option<RichText>,
    private location: [S['SourceId'], number],
    private locationDisplay: LocationDisplay | undefined,
    private labels: Label<S>[],
    private config: Config,
    private semanticTokenCapability?: SemanticTokenCapability,
    private semanticTokenProvider?: SemanticTokenProvider,
  ) {}
  /// Give this report a numerical code that may be used to more precisely look up the error in documentation.
  with_diag_code(code: number | string): this {
    this.code = some(code.toString().padStart(2, '0'))
    return this
  }

  /// Set the message of this report.
  set_message(msg: RichTextInput) {
    this.msg = some(RichText.from(msg))
  }

  /// Add a message to this report.
  with_message(msg: RichTextInput): this {
    this.set_message(msg)
    return this
  }

  /// Set the note of this report.
  set_note(note: RichTextInput) {
    this.note = some(RichText.from(note))
  }

  /// Set the note of this report.
  with_note(note: RichTextInput): this {
    this.set_note(note)
    return this
  }

  /// Set the help message of this report.
  set_help(note: RichTextInput) {
    this.help = some(RichText.from(note))
  }

  /// Set the help message of this report.
  with_help(note: RichTextInput): this {
    this.set_help(note)
    return this
  }

  /// Add a label to the report.
  add_label(label: Label<S>) {
    this.labels.push(label)
  }

  /// Add multiple labels to the report.
  add_labels(labels: Label<S>[]) {
    this.labels.push(...labels)
  }

  /// Add a label to the report.
  with_label(label: Label<S>): this {
    this.add_label(label)
    return this
  }

  /// Use the given [`Config`] to determine diagnostic attributes.
  with_config(config: Config): this {
    this.config = config
    return this
  }

  with_location_display(display: LocationDisplay): this {
    this.locationDisplay = display
    return this
  }

  with_semantic_token_capability(
    options: SemanticTokenCapability = {
      tokenTypes: [...semanticTokenTypes],
      tokenModifiers: [...semanticTokenModifiers],
    },
  ): this {
    this.semanticTokenCapability = validateSemanticTokenCapability(options)
    return this
  }

  /// Request LSP delta semantic tokens for the zero-based, end-exclusive
  /// source line range used by this diagnostic.
  with_semantic_token_ranged(
    provide: (
      filename: string,
      start_line: number,
      end_line: number,
    ) => number[],
  ): this {
    this.semanticTokenProvider = { kind: 'ranged', provide }
    return this
  }

  /// Request LSP delta semantic tokens for the complete source file. The first
  /// token is relative to document position (0, 0).
  with_semantic_token_full(provide: (filename: string) => number[]): this {
    this.semanticTokenProvider = { kind: 'full', provide }
    return this
  }

  /// Finish building the [`Report`].
  finish(): Report<S> {
    const r = new Report<S>(
      this.kind,
      this.code,
      this.msg,
      this.note,
      this.help,
      this.location,
      this.locationDisplay,
      this.labels,
      this.config,
      this.semanticTokenCapability,
      this.semanticTokenProvider,
    )
    return r
  }
}
