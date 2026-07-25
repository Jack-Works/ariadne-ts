export type ColorFn = (value: string) => string

function ansi(open: string, close: string): ColorFn {
  return (value) => `\u001B[${open}m${value}\u001B[${close}m`
}

export const colors = {
  blue: ansi('34', '39'),
  green: ansi('32', '39'),
  red: ansi('31', '39'),
  yellow: ansi('33', '39'),
}

export abstract class Color {
  static Fixed = Fixed
  static Named = colors
}

export function Fixed(n: number) {
  return ansi(`38;5;${n}`, '39')
}
