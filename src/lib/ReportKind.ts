/// The kind of report being produced.
export enum ReportKind {
  /// A critical problem that prevents the requested action.
  Error = 'Error',
  /// A likely problem that does not prevent the requested action.
  Warning = 'Warning',
  /// Advice about a potential anti-pattern or other benign issue.
  Advice = 'Advice',
  /// A report kind not built into Ariadne.
  Custom = 'Custom',
}
