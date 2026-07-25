# @magic-works/ariadne

> This is a fork of [ariadne-ts](https://github.com/Duroktar/ariadne-ts/)

[![npm version](https://img.shields.io/npm/v/@magic-works/ariadne.svg?style=flat-square)](https://www.npmjs.com/package/@magic-works/ariadne)
[![release status](https://img.shields.io/github/actions/workflow/status/Jack-Works/ariadne-ts/release.yml?style=flat-square)](https://github.com/Jack-Works/ariadne-ts/actions/workflows/release.yml)
[![license](https://img.shields.io/npm/l/@magic-works/ariadne.svg?style=flat-square)](./LICENSE)

A TypeScript library for generating beautiful, Rust-style compiler diagnostics.

`@magic-works/ariadne` helps you create elegant, informative, and context-aware error reports for compilers, linters, static analyzers, or any other tool that needs to report errors in source code.

![ariadne-ts Example Output](https://raw.githubusercontent.com/Jack-Works/ariadne-ts/main/example.png)

## About

This library is a port of the excellent Rust crate [`ariadne`](https://github.com/zesterer/ariadne) with new features. Ariadne is a powerful tool for generating diagnostics that are easy to read and understand, heavily inspired by the error reporting style of the Rust compiler, `rustc`.

## Features

- **Multi-Label Diagnostics:** Attach multiple labels to a single report to highlight related code locations.
- **Custom Colors & Themes:** Full control over the colors used in your reports to match your tool's branding or user preferences.
- **Complex Pointer Support:** Create clear, non-overlapping annotations for even the most complex and nested code structures.
- **Informative Notes & Help Text:** Add extra notes and hints to your reports to guide users toward a solution.
- **Framework-Agnostic:** Pure TypeScript with no dependencies, easy to integrate into any project.

## Installation

```bash
pnpm add @magic-works/ariadne
```

## Examples

TypeScript examples are available in the [`examples`](./examples) directory.

## Core API

The standard report builder workflow uses these exports:

| Export          | Purpose                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| `Report`        | Starts a diagnostic with `Report.build(...)`, calculates its layout, and produces plain-text, ANSI, or HTML output. |
| `ReportKind`    | Selects the diagnostic severity, such as `Error`, `Warning`, or `Advice`.                                           |
| `Label`         | Associates a source range with an optional annotation message and color.                                            |
| `Range`         | Defines the zero-based, end-exclusive character offsets covered by a label.                                         |
| `Source`        | Wraps the source string consumed when the report is laid out and rendered.                                          |
| `SpanInit`      | Names a sourced span as `{ sourceId, range }`, or an offset-only span as `{ start, end }`.                          |
| `SourceInput`   | Supplies layout and rendering with `{ sourceId, source }`, a `Source`, or a custom source provider.                 |
| `LayoutOptions` | Configures the required maximum output width and optional surrounding context lines.                                |
| `OutputBackend` | Identifies the `plain`, `ansi`, or `html` output selected by `Report.render`.                                       |

`LayoutOptions` and `OutputBackend` are usually inferred from the arguments passed
to `Report.render`; import them explicitly when exposing those values through your
own API. Rich text, semantic tokens, custom renderers, color schemes, and AST
helpers are optional extensions.

## Contributing

Contributions are welcome\! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Acknowledgements

- A huge thank you to [zesterer](https://github.com/zesterer) and all the contributors to the original [`ariadne`](https://github.com/zesterer/ariadne) for creating such a fantastic library.
- A huge thank you to [Duroktar](https://github.com/Duroktar) and all the contributors to the port of Rust's ariadne to TypeScript.
