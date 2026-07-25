/// A type that defines the kind of report being produced.

export class ReportKind {
  /// The report is an error and indicates a critical problem that prevents the program performing the requested
  /// action.
  static Error = class Error extends ReportKind {}
  /// The report is a warning and indicates a likely problem, but not to the extent that the requested action cannot
  /// be performed.
  static Warning = class Warning extends ReportKind {}
  /// The report is advice to the user about a potential anti-pattern of other benign issues.
  static Advice = class Advice extends ReportKind {}
  /// The report is of a kind not built into Ariadne.
  static Custom = class Custom extends ReportKind {}
}

export type ReportKindConstructor =
  | typeof ReportKind.Error
  | typeof ReportKind.Warning
  | typeof ReportKind.Advice
  | typeof ReportKind.Custom
