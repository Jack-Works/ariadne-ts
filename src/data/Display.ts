import { DiagnosticSpan } from '../ir.js'
import { ColorValue } from '../lib/Color.js'
import { isOption, type Option } from './Option.js'

export class Display {
  constructor(value: string | Display) {
    this.value = typeof value === 'string' ? value : value.value
    this.foreground = typeof value === 'string' ? undefined : value.foreground
  }
  fg(color: Option<ColorValue> | ColorValue): this {
    if (isOption(color)) {
      if (color.is_some()) this.foreground = color.unwrap()
    } else {
      this.foreground = color
    }
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
    return this.foreground === undefined
      ? { text: this.value }
      : { text: this.value, foreground: this.foreground }
  }
  toString(): string {
    return this.value
  }
  unwrap_or_else(d: () => string): string {
    return this.value ?? d()
  }

  private value: string
  private foreground: ColorValue | undefined

  static is = (o: unknown): o is Display => o instanceof Display
}

export const isDisplay = Display.is
