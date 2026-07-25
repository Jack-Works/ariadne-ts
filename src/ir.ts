import { ColorValue, Fixed } from './lib/Color.js'
import { SemanticToken } from './semantic_tokens.js'

export interface DiagnosticSpan {
  text: string
  foreground?: ColorValue
  semanticToken?: SemanticToken
  link?: string
}

export interface DiagnosticIR {
  version: 1
  maxWidth: number
  spans: DiagnosticSpan[]
}

export type OutputBackend = 'plain' | 'ansi' | 'html'

export interface LayoutOptions {
  maxWidth: number
  contextLines?: number
}

export interface ANSISemanticTokenColorScheme {
  default: ColorValue
  tokenTypes: Record<string, ColorValue>
  tokenModifiers: Record<string, ColorValue>
}

export interface HTMLSemanticTokenColorScheme {
  default: string
  foreground: string
  tokenTypes: Record<string, string>
  tokenModifiers: Record<string, string>
}

export interface HTMLTextColorScheme {
  default: string
  named: Record<'blue' | 'green' | 'red' | 'yellow', string>
  ansi256: readonly string[]
}

// Adapted from VS Code Dark+:
// https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_plus.json
// https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/dark_vs.json
export const defaultANSISemanticTokenColorScheme: ANSISemanticTokenColorScheme =
  {
    default: Fixed(252),
    tokenTypes: {
      namespace: Fixed(79),
      type: Fixed(79),
      class: Fixed(79),
      enum: Fixed(79),
      interface: Fixed(79),
      struct: Fixed(79),
      typeParameter: Fixed(79),
      parameter: Fixed(153),
      variable: Fixed(153),
      property: Fixed(153),
      enumMember: Fixed(81),
      event: Fixed(187),
      function: Fixed(187),
      method: Fixed(187),
      macro: Fixed(176),
      label: Fixed(251),
      comment: Fixed(65),
      string: Fixed(173),
      keyword: Fixed(68),
      number: Fixed(151),
      regexp: Fixed(167),
      operator: Fixed(252),
      decorator: Fixed(187),
    },
    tokenModifiers: {},
  }

export const defaultHTMLSemanticTokenColorScheme: HTMLSemanticTokenColorScheme =
  {
    // Light+ and Dark+ are selected without taking ownership of the host background.
    // https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/light_plus.json
    // https://github.com/microsoft/vscode/blob/main/extensions/theme-defaults/themes/light_vs.json
    default: 'light-dark(#000000, #d4d4d4)',
    foreground: 'light-dark(#000000, #d4d4d4)',
    tokenTypes: {
      namespace: 'light-dark(#267f99, #4ec9b0)',
      type: 'light-dark(#267f99, #4ec9b0)',
      class: 'light-dark(#267f99, #4ec9b0)',
      enum: 'light-dark(#267f99, #4ec9b0)',
      interface: 'light-dark(#267f99, #4ec9b0)',
      struct: 'light-dark(#267f99, #4ec9b0)',
      typeParameter: 'light-dark(#267f99, #4ec9b0)',
      parameter: 'light-dark(#001080, #9cdcfe)',
      variable: 'light-dark(#001080, #9cdcfe)',
      property: 'light-dark(#001080, #9cdcfe)',
      enumMember: 'light-dark(#0070c1, #4fc1ff)',
      event: 'light-dark(#795e26, #dcdcaa)',
      function: 'light-dark(#795e26, #dcdcaa)',
      method: 'light-dark(#795e26, #dcdcaa)',
      macro: 'light-dark(#af00db, #c586c0)',
      label: 'light-dark(#000000, #c8c8c8)',
      comment: 'light-dark(#008000, #6a9955)',
      string: 'light-dark(#a31515, #ce9178)',
      keyword: 'light-dark(#0000ff, #569cd6)',
      number: 'light-dark(#098658, #b5cea8)',
      regexp: 'light-dark(#811f3f, #d16969)',
      operator: 'light-dark(#000000, #d4d4d4)',
      decorator: 'light-dark(#795e26, #dcdcaa)',
    },
    tokenModifiers: {},
  }

export const defaultHTMLTextColorScheme: HTMLTextColorScheme = {
  default: 'light-dark(#000000, #d4d4d4)',
  named: {
    blue: 'light-dark(#0000ff, #569cd6)',
    green: 'light-dark(#008000, #6a9955)',
    red: 'light-dark(#cd3131, #f44747)',
    yellow: 'light-dark(#098658, #b5cea8)',
  },
  ansi256: [
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
    '#000000',
    '#00005f',
    '#000087',
    '#0000af',
    '#0000d7',
    '#0000ff',
    '#005f00',
    '#005f5f',
    '#005f87',
    '#005faf',
    '#005fd7',
    '#005fff',
    '#008700',
    '#00875f',
    '#008787',
    '#0087af',
    '#0087d7',
    '#0087ff',
    '#00af00',
    '#00af5f',
    '#00af87',
    '#00afaf',
    '#00afd7',
    '#00afff',
    '#00d700',
    '#00d75f',
    '#00d787',
    '#00d7af',
    '#00d7d7',
    '#00d7ff',
    '#00ff00',
    '#00ff5f',
    '#00ff87',
    '#00ffaf',
    '#00ffd7',
    '#00ffff',
    '#5f0000',
    '#5f005f',
    '#5f0087',
    '#5f00af',
    '#5f00d7',
    '#5f00ff',
    '#5f5f00',
    '#5f5f5f',
    '#5f5f87',
    '#5f5faf',
    '#5f5fd7',
    '#5f5fff',
    '#5f8700',
    '#5f875f',
    '#5f8787',
    '#5f87af',
    '#5f87d7',
    '#5f87ff',
    '#5faf00',
    '#5faf5f',
    '#5faf87',
    '#5fafaf',
    '#5fafd7',
    '#5fafff',
    '#5fd700',
    '#5fd75f',
    '#5fd787',
    '#5fd7af',
    '#5fd7d7',
    '#5fd7ff',
    '#5fff00',
    '#5fff5f',
    '#5fff87',
    '#5fffaf',
    '#5fffd7',
    '#5fffff',
    '#870000',
    '#87005f',
    '#870087',
    '#8700af',
    '#8700d7',
    '#8700ff',
    '#875f00',
    '#875f5f',
    '#875f87',
    '#875faf',
    '#875fd7',
    '#875fff',
    '#878700',
    '#87875f',
    '#878787',
    '#8787af',
    '#8787d7',
    '#8787ff',
    '#87af00',
    '#87af5f',
    '#87af87',
    '#87afaf',
    '#87afd7',
    '#87afff',
    '#87d700',
    '#87d75f',
    '#87d787',
    '#87d7af',
    '#87d7d7',
    '#87d7ff',
    '#87ff00',
    '#87ff5f',
    '#87ff87',
    '#87ffaf',
    '#87ffd7',
    '#87ffff',
    '#af0000',
    '#af005f',
    '#af0087',
    '#af00af',
    '#af00d7',
    '#af00ff',
    '#af5f00',
    '#af5f5f',
    '#af5f87',
    '#af5faf',
    '#af5fd7',
    '#af5fff',
    '#af8700',
    '#af875f',
    '#af8787',
    '#af87af',
    '#af87d7',
    '#af87ff',
    '#afaf00',
    '#afaf5f',
    '#afaf87',
    '#afafaf',
    '#afafd7',
    '#afafff',
    '#afd700',
    '#afd75f',
    '#afd787',
    '#afd7af',
    '#afd7d7',
    '#afd7ff',
    '#afff00',
    '#afff5f',
    '#afff87',
    '#afffaf',
    '#afffd7',
    '#afffff',
    '#d70000',
    '#d7005f',
    '#d70087',
    '#d700af',
    '#d700d7',
    '#d700ff',
    '#d75f00',
    '#d75f5f',
    '#d75f87',
    '#d75faf',
    '#d75fd7',
    '#d75fff',
    '#d78700',
    '#d7875f',
    '#d78787',
    '#d787af',
    '#d787d7',
    '#d787ff',
    '#d7af00',
    '#d7af5f',
    '#d7af87',
    '#d7afaf',
    '#d7afd7',
    '#d7afff',
    '#d7d700',
    '#d7d75f',
    '#d7d787',
    '#d7d7af',
    '#d7d7d7',
    '#d7d7ff',
    '#d7ff00',
    '#d7ff5f',
    '#d7ff87',
    '#d7ffaf',
    '#d7ffd7',
    '#d7ffff',
    '#ff0000',
    '#ff005f',
    '#ff0087',
    '#ff00af',
    '#ff00d7',
    '#ff00ff',
    '#ff5f00',
    '#ff5f5f',
    '#ff5f87',
    '#ff5faf',
    '#ff5fd7',
    '#ff5fff',
    '#ff8700',
    '#ff875f',
    '#ff8787',
    '#ff87af',
    '#ff87d7',
    '#ff87ff',
    '#ffaf00',
    '#ffaf5f',
    '#ffaf87',
    '#ffafaf',
    '#ffafd7',
    '#ffafff',
    '#ffd700',
    '#ffd75f',
    '#ffd787',
    '#ffd7af',
    '#ffd7d7',
    '#ffd7ff',
    '#ffff00',
    '#ffff5f',
    '#ffff87',
    '#ffffaf',
    '#ffffd7',
    '#ffffff',
    '#080808',
    '#121212',
    '#1c1c1c',
    '#262626',
    '#303030',
    '#3a3a3a',
    '#444444',
    '#4e4e4e',
    '#585858',
    '#626262',
    '#6c6c6c',
    '#767676',
    '#808080',
    '#8a8a8a',
    '#949494',
    '#9e9e9e',
    '#a8a8a8',
    '#b2b2b2',
    '#bcbcbc',
    '#c6c6c6',
    '#d0d0d0',
    '#dadada',
    '#e4e4e4',
    '#eeeeee',
  ],
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

function ansiLink(link: string | undefined, content: string): string {
  if (link === undefined) return content
  const target = link.replaceAll(/[\u001B\u0007]/g, '')
  return `\u001B]8;;${target}\u001B\\${content}\u001B]8;;\u001B\\`
}

function htmlTextColor(
  color: ColorValue,
  colorScheme: HTMLTextColorScheme,
): string {
  if (color.kind === 'named') return colorScheme.named[color.name]
  return colorScheme.ansi256[color.index] ?? colorScheme.default
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', '&quot;').replaceAll("'", '&#39;')
}

function htmlLink(link: string | undefined, content: string): string {
  if (link === undefined) return content
  return `<a href="${escapeHtmlAttribute(link)}">${content}</a>`
}

function semanticTokenColor<Color>(
  token: SemanticToken,
  defaultColor: Color,
  tokenTypes: Record<string, Color>,
  tokenModifiers: Record<string, Color>,
): Color {
  for (const modifier of token.tokenModifiers) {
    const color = tokenModifiers[modifier]
    if (color !== undefined) return color
  }
  return tokenTypes[token.tokenType] ?? defaultColor
}

export abstract class IR_Render {
  render(ir: DiagnosticIR): string {
    const content = ir.spans
      .map((span) => {
        if (span.semanticToken === undefined) return this.render_text(span)
        return this.render_token(span, span.semanticToken)
      })
      .join('')
    return this.render_container(content)
  }

  protected abstract render_text(span: DiagnosticSpan): string

  protected abstract render_token(
    span: DiagnosticSpan,
    token: SemanticToken,
  ): string

  protected render_container(content: string): string {
    return content
  }
}

export class Plain_IR_Render extends IR_Render {
  protected render_text(span: DiagnosticSpan): string {
    return span.text
  }

  protected render_token(span: DiagnosticSpan): string {
    return span.text
  }
}

export class ANSI_IR_Render extends IR_Render {
  constructor(
    private readonly colorScheme: ANSISemanticTokenColorScheme = defaultANSISemanticTokenColorScheme,
  ) {
    super()
  }

  protected render_text(span: DiagnosticSpan): string {
    const text =
      span.foreground === undefined
        ? span.text
        : `${ansiOpen(span.foreground)}${span.text}\u001B[39m`
    return ansiLink(span.link, text)
  }

  protected render_token(span: DiagnosticSpan, token: SemanticToken): string {
    const color = semanticTokenColor(
      token,
      this.colorScheme.default,
      this.colorScheme.tokenTypes,
      this.colorScheme.tokenModifiers,
    )
    const dim = token.tokenModifiers.includes('unquoted')
    const text = `${ansiOpen(color)}${dim ? '\u001B[2m' : ''}${span.text}${dim ? '\u001B[22m' : ''}\u001B[39m`
    return ansiLink(span.link, text)
  }
}

export class HTML_IR_Render extends IR_Render {
  constructor(
    private readonly colorScheme: HTMLSemanticTokenColorScheme = defaultHTMLSemanticTokenColorScheme,
    private readonly textColorScheme: HTMLTextColorScheme = defaultHTMLTextColorScheme,
  ) {
    super()
  }

  protected render_text(span: DiagnosticSpan): string {
    const text = escapeHtml(span.text)
    if (span.foreground === undefined) return htmlLink(span.link, text)
    const color = htmlTextColor(span.foreground, this.textColorScheme)
    return htmlLink(
      span.link,
      `<span style="color: ${escapeHtmlAttribute(color)}">${text}</span>`,
    )
  }

  protected render_token(span: DiagnosticSpan, token: SemanticToken): string {
    const color = semanticTokenColor(
      token,
      this.colorScheme.default,
      this.colorScheme.tokenTypes,
      this.colorScheme.tokenModifiers,
    )
    const tokenType = escapeHtmlAttribute(token.tokenType)
    const tokenModifiers = escapeHtmlAttribute(token.tokenModifiers.join(' '))
    const opacity = token.tokenModifiers.includes('unquoted')
      ? '; opacity: 0.65'
      : ''
    return htmlLink(
      span.link,
      `<span data-token-type="${tokenType}" data-token-modifiers="${tokenModifiers}" style="color: ${escapeHtmlAttribute(color)}${opacity}">${escapeHtml(span.text)}</span>`,
    )
  }

  protected render_container(content: string): string {
    const foreground = escapeHtmlAttribute(this.colorScheme.foreground)
    return `<pre style="color-scheme: light dark; color: ${foreground}">${content}</pre>`
  }
}

export function renderPlain(ir: DiagnosticIR): string {
  return new Plain_IR_Render().render(ir)
}

export function renderAnsi(ir: DiagnosticIR): string {
  return new ANSI_IR_Render().render(ir)
}

export function renderHtml(ir: DiagnosticIR): string {
  return new HTML_IR_Render().render(ir)
}

export function renderIR(ir: DiagnosticIR, backend: OutputBackend): string {
  if (backend === 'plain') return renderPlain(ir)
  if (backend === 'ansi') return renderAnsi(ir)
  return renderHtml(ir)
}
