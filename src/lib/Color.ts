export type ColorValue =
  | {
      kind: 'named'
      name: 'blue' | 'green' | 'red' | 'yellow'
    }
  | {
      kind: 'ansi256'
      index: number
    }

export const colors = {
  blue: { kind: 'named', name: 'blue' },
  green: { kind: 'named', name: 'green' },
  red: { kind: 'named', name: 'red' },
  yellow: { kind: 'named', name: 'yellow' },
} as const satisfies Record<string, ColorValue>

export abstract class Color {
  static Fixed = Fixed
  static Named = colors
}

export function Fixed(n: number) {
  return { kind: 'ansi256', index: n } as const satisfies ColorValue
}
