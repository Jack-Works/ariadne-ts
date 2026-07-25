---
'@magic-works/ariadne': minor
---

Remove `ReportKind` and `with_diag_code`, and make report headers entirely message-driven. Migrate `Report.build(ReportKind.Error, sourceId, offset)` to `Report.build(sourceId, offset)`, remove `ReportKind` imports and the `type` option from `createDiagnostic`, and include any severity text or diagnostic code (for example, `[E03] Error:`) in `with_message` yourself.

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
