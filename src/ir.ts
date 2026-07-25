import { ColorValue } from './lib/Color.js'

export interface DiagnosticSpan {
  text: string
  foreground?: ColorValue
}

export interface DiagnosticIR {
  version: 1
  maxWidth: number
  spans: DiagnosticSpan[]
}

export type OutputBackend = 'plain' | 'ansi' | 'html'

export interface LayoutOptions {
  maxWidth: number
}

const namedAnsiCodes = {
  blue: 34,
  green: 32,
  red: 31,
  yellow: 33,
} as const

function ansiOpen(color: ColorValue): string {
  const code =
    color.kind === 'named' ? namedAnsiCodes[color.name] : `38;5;${color.index}`
  return `\u001B[${code}m`
}

function ansi256ToCss(index: number): string {
  const base = [
    '#000000',
    '#800000',
    '#008000',
    '#808000',
    '#000080',
    '#800080',
    '#008080',
    '#c0c0c0',
    '#808080',
    '#ff0000',
    '#00ff00',
    '#ffff00',
    '#0000ff',
    '#ff00ff',
    '#00ffff',
    '#ffffff',
  ]
  if (index < 16) return base[index] ?? '#000000'
  if (index >= 232) {
    const value = 8 + (index - 232) * 10
    return `rgb(${value}, ${value}, ${value})`
  }
  const cubeIndex = index - 16
  const red = Math.floor(cubeIndex / 36)
  const green = Math.floor((cubeIndex % 36) / 6)
  const blue = cubeIndex % 6
  const channel = (value: number) => (value === 0 ? 0 : 55 + value * 40)
  return `rgb(${channel(red)}, ${channel(green)}, ${channel(blue)})`
}

function cssColor(color: ColorValue): string {
  return color.kind === 'named' ? color.name : ansi256ToCss(color.index)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

export function renderPlain(ir: DiagnosticIR): string {
  return ir.spans.map((span) => span.text).join('')
}

export function renderAnsi(ir: DiagnosticIR): string {
  return ir.spans
    .map((span) => {
      if (span.foreground === undefined) return span.text
      return `${ansiOpen(span.foreground)}${span.text}\u001B[39m`
    })
    .join('')
}

export function renderHtml(ir: DiagnosticIR): string {
  const content = ir.spans
    .map((span) => {
      const text = escapeHtml(span.text)
      if (span.foreground === undefined) return text
      return `<span style="color: ${cssColor(span.foreground)}">${text}</span>`
    })
    .join('')
  return `<pre>${content}</pre>`
}

export function renderIR(ir: DiagnosticIR, backend: OutputBackend): string {
  if (backend === 'plain') return renderPlain(ir)
  if (backend === 'ansi') return renderAnsi(ir)
  return renderHtml(ir)
}
