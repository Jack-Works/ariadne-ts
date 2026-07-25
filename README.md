# @magic-works/ariadne

> This is a fork of [ariadne-ts](https://github.com/Duroktar/ariadne-ts/)

[![npm version](https://img.shields.io/npm/v/@magic-works/ariadne.svg?style=flat-square)](https://www.npmjs.com/package/@magic-works/ariadne)
[![release status](https://img.shields.io/github/actions/workflow/status/Jack-Works/ariadne-ts/release.yml?style=flat-square)](https://github.com/Jack-Works/ariadne-ts/actions/workflows/release.yml)
[![license](https://img.shields.io/npm/l/@magic-works/ariadne.svg?style=flat-square)](./LICENSE)

A TypeScript library for generating beautiful, Rust-style compiler diagnostics.

`@magic-works/ariadne` helps you create elegant, informative, and context-aware error reports for compilers, linters, static analyzers, or any other tool that needs to report errors in source code.

![Ariadne-ts Example Output](https://raw.githubusercontent.com/zesterer/ariadne/main/misc/example.png)

_The screenshot above is from the original Rust library, but `@magic-works/ariadne` produces identically-styled text-based output._

## About

This library is a direct port of the excellent Rust crate [`ariadne`](https://github.com/zesterer/ariadne). Ariadne is a powerful tool for generating diagnostics that are easy to read and understand, heavily inspired by the error reporting style of the Rust compiler, `rustc`.

> **Note:** While `ariadne`'s output is designed to look and feel like `rustc`'s, it is a separate, third-party library and not used by the Rust compiler itself. Its goal is to bring that same high-quality developer experience to other language tools.

## Features

- **Multi-Label Diagnostics:** Attach multiple labels to a single report to highlight related code locations.
- **Custom Colors & Themes:** Full control over the colors used in your reports to match your tool's branding or user preferences.
- **Complex Pointer Support:** Create clear, non-overlapping annotations for even the most complex and nested code structures.
- **Informative Notes & Help Text:** Add extra notes and hints to your reports to guide users toward a solution.
- **Framework-Agnostic:** Pure TypeScript with minimal dependencies, easy to integrate into any project.

## Installation

```bash
pnpm add @magic-works/ariadne
```

## Examples

TypeScript examples are available in the [`examples`](./examples) directory.

## Contributing

Contributions are welcome\! Please feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Acknowledgements

- A huge thank you to [zesterer](https://github.com/zesterer) and all the contributors to the original [`ariadne`](https://github.com/zesterer/ariadne) for creating such a fantastic library.
- A huge thank you to [Duroktar](https://github.com/Duroktar) and all the contributors to the port of Rust's ariadne to TypeScript.
