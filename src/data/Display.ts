import { DiagnosticSpan } from '../ir.js'
import { ColorValue } from '../lib/Color.js'
import { SemanticToken } from '../semantic_tokens.js'
import { isOption, type Option } from './Option.js'

export class Display {
  constructor(value: string | Display) {
    this.value = typeof value === 'string' ? value : value.value
    this.foreground = typeof value === 'string' ? undefined : value.foreground
    this.semanticToken =
      typeof value === 'string' ? undefined : value.semanticToken
    this.link = typeof value === 'string' ? undefined : value.link
  }
  fg(color: Option<ColorValue> | ColorValue): this {
    if (isOption(color)) {
      if (color.is_some()) this.foreground = color.unwrap()
    } else {
      this.foreground = color
    }
    return this
  }
  withSemanticToken(semanticToken: SemanticToken | undefined): this {
    this.semanticToken = semanticToken
    return this
  }
  withLink(link: string | undefined): this {
    this.link = link
    return this
  }
  chars(): string {
    return this.value
  }
  map(fn: (d: string) => string): Display {
    return new Display(fn(this.value))
  }
  display(): string {
    return this.value
  }
  toSpan(): DiagnosticSpan {
    return {
      text: this.value,
      ...(this.foreground === undefined ? {} : { foreground: this.foreground }),
      ...(this.semanticToken === undefined
        ? {}
        : { semanticToken: this.semanticToken }),
      ...(this.link === undefined ? {} : { link: this.link }),
    }
  }
  toString(): string {
    return this.value
  }
  unwrap_or_else(d: () => string): string {
    return this.value ?? d()
  }

  private value: string
  private foreground: ColorValue | undefined
  private semanticToken: SemanticToken | undefined
  private link: string | undefined

  static is = (o: unknown): o is Display => o instanceof Display
}

export const isDisplay = Display.is
