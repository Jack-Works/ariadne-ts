# @magic-works/ariadne

## 0.6.0

### Minor Changes

- 3d5ecc0: Mark implementation-only declarations as internal and enable TypeScript's `stripInternal` declaration output. This removes the following APIs from the supported public surface: `format`, `shortestEdit`, `EditRange`, `ShortestEdit`, `write`, `writeln`, `Write`, `createIRWriter`, `IdSource`, `SourceGroup`, `LabelKind`, `LabelInfo`, `Characters`, `iCharacters`, utility helpers, semantic-token encoding and AST traversal helpers, semantic-token capability validation and decoding helpers, RichText diagnostic-rendering helpers, and direct construction or state inspection of `Label` and `Report`.

### Patch Changes

- 3d5ecc0: improve diff
- 9697641: fix indent of multiline diff

## 0.5.0

### Minor Changes

- a366e6a: Remove `ReportKind` and `with_diag_code`, and make report headers entirely message-driven. Migrate `Report.build(ReportKind.Error, sourceId, offset)` to `Report.build(sourceId, offset)`, remove `ReportKind` imports and the `type` option from `createDiagnostic`, and include any severity text or diagnostic code (for example, `[E03] Error:`) in `with_message` yourself.

  Add Ariadne-specific `error`, `warning`, and `advice` semantic token types with default ANSI and HTML colors. Use a rich-text span such as `{ text: 'Error', semanticToken: 'error' }` to color severity text.

  ```diff
  - import { ReportKind } from '@magic-works/ariadne'
  + import { RichText } from '@magic-works/ariadne'

  - Report.build(ReportKind.Error, sourceId, offset)
  -   .with_diag_code(3)
  -   .with_message('Incompatible types')
  + Report.build(sourceId, offset).with_message(
  +   RichText.from([
  +     { text: '[E03] Error:', semanticToken: 'error' },
  +     ' Incompatible types',
  +   ]),
  + )
  ```

## 0.4.0

### Minor Changes

- 183991d: add semantic token helper for ts and estree
- 5797884: Fork the original `ariadne-ts` package.
- 7b88645: remove dependencies to Node.js API, make it a pure library
- 2ef1e80: add semantic token and syntax highlighting
- 2ef1e80: add rich text (link) and multiline text
- 151de98: add diff
- 7c34873: add HTML output, add IR
