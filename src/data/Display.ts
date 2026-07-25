import { isCallback } from '../utils/index.js'
import { ColorFn } from '../lib/Color.js'
import { isOption, type Option } from './Option.js'

export class Display {
  constructor(value: string | Display) {
    this.value = typeof value === 'string' ? value : value.value
  }
  fg(color: Option<ColorFn> | ColorFn): this {
    if (isOption(color)) {
      const func = color.unwrap_or_else(() => (value: string) => value)
      this.value = func(this.value)
    } else if (isCallback(color)) {
      this.value = color(this.value)
    }
    return this
  }
  bg(color: Option<ColorFn> | ColorFn): this {
    if (isOption(color)) {
      const func = color.unwrap_or_else(() => (value: string) => value)
      this.value = func(this.value)
    } else if (isCallback(color)) {
      this.value = color(this.value)
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
  toString(): string {
    return this.value
  }
  unwrap_or_else(d: () => string): string {
    return this.value ?? d()
  }

  private value: string

  static is = (o: unknown): o is Display => o instanceof Display
}

export const isDisplay = Display.is
