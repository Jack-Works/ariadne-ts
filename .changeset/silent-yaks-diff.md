---
'@magic-works/ariadne': minor
---

Mark implementation-only declarations as internal and enable TypeScript's `stripInternal` declaration output. This removes the following APIs from the supported public surface: `format`, `shortestEdit`, `EditRange`, `ShortestEdit`, `write`, `writeln`, `Write`, `createIRWriter`, `IdSource`, `SourceGroup`, `LabelKind`, `LabelInfo`, `Characters`, `iCharacters`, utility helpers, semantic-token encoding and AST traversal helpers, semantic-token capability validation and decoding helpers, RichText diagnostic-rendering helpers, and direct construction or state inspection of `Label` and `Report`.
