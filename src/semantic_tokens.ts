// LSP 3.18 predefined semantic token legend:
// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#semanticTokenTypes
export const semanticTokenTypes = [
  'namespace',
  'type',
  'class',
  'enum',
  'interface',
  'struct',
  'typeParameter',
  'parameter',
  'variable',
  'property',
  'enumMember',
  'event',
  'function',
  'method',
  'macro',
  'keyword',
  'modifier',
  'comment',
  'string',
  'number',
  'regexp',
  'operator',
  'decorator',
  'label',
] as const

// https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#semanticTokenModifiers
export const semanticTokenModifiers = [
  'declaration',
  'definition',
  'readonly',
  'static',
  'deprecated',
  'abstract',
  'async',
  'modification',
  'documentation',
  'defaultLibrary',
  // Ariadne's token, used to mark tokens that outside of the diagnostic's range.
  'unquoted',
] as const

export interface SemanticTokenCapability {
  tokenTypes: string[]
  tokenModifiers: string[]
}

export interface SemanticToken {
  tokenType: string
  tokenModifiers: string[]
}

export interface DecodedSemanticToken extends SemanticToken {
  line: number
  start: number
  length: number
}

export type SemanticTokenProvider =
  | {
      kind: 'ranged'
      provide: (
        filename: string,
        start_line: number,
        end_line: number,
      ) => number[]
    }
  | {
      kind: 'full'
      provide: (filename: string) => number[]
    }

export function validateSemanticTokenCapability(
  capability: SemanticTokenCapability,
): SemanticTokenCapability {
  if (
    [...capability.tokenTypes, ...capability.tokenModifiers].some(
      (value) => value.length === 0,
    )
  ) {
    throw new Error('semantic token names must not be empty')
  }
  if (capability.tokenModifiers.length > 31) {
    throw new Error('at most 31 semantic token modifiers are supported')
  }
  if (new Set(capability.tokenTypes).size !== capability.tokenTypes.length) {
    throw new Error('semantic token types must be unique')
  }
  if (
    new Set(capability.tokenModifiers).size !== capability.tokenModifiers.length
  ) {
    throw new Error('semantic token modifiers must be unique')
  }
  return {
    tokenTypes: [...capability.tokenTypes],
    tokenModifiers: [...capability.tokenModifiers],
  }
}

export function decodeSemanticTokens(
  data: readonly number[],
  capability: SemanticTokenCapability,
): DecodedSemanticToken[] {
  // LSP semantic token data is encoded as relative five-integer tuples:
  // https://microsoft.github.io/language-server-protocol/specifications/lsp/3.18/specification/#textDocument_semanticTokens
  if (data.length % 5 !== 0) {
    throw new Error('semantic token data length must be divisible by 5')
  }

  const tokens: DecodedSemanticToken[] = []
  let previousLine = 0
  let previousStart = 0

  for (let index = 0; index < data.length; index += 5) {
    const tuple = data.slice(index, index + 5)
    if (!tuple.every((value) => Number.isSafeInteger(value) && value >= 0)) {
      throw new Error('semantic token data must contain non-negative integers')
    }
    const [deltaLine, deltaStart, length, tokenTypeIndex, modifierBits] =
      tuple as [number, number, number, number, number]
    if (length === 0) {
      throw new Error('semantic token length must be greater than zero')
    }

    const line = previousLine + deltaLine
    const start = deltaLine === 0 ? previousStart + deltaStart : deltaStart
    const tokenType = capability.tokenTypes[tokenTypeIndex]
    if (tokenType === undefined) {
      throw new Error(`unknown semantic token type index ${tokenTypeIndex}`)
    }

    const tokenModifiers = capability.tokenModifiers.filter((_, bit) => {
      const divisor = 2 ** bit
      return Math.floor(modifierBits / divisor) % 2 === 1
    })
    const knownModifierBits =
      capability.tokenModifiers.length === 0
        ? 0
        : 2 ** capability.tokenModifiers.length - 1
    if (modifierBits > knownModifierBits) {
      throw new Error('semantic token modifier bitset uses an unknown modifier')
    }

    const previous = tokens.at(-1)
    if (
      previous &&
      previous.line === line &&
      previous.start + previous.length > start
    ) {
      throw new Error('semantic tokens must be sorted and non-overlapping')
    }

    tokens.push({
      line,
      start,
      length,
      tokenType,
      tokenModifiers,
    })
    previousLine = line
    previousStart = start
  }

  return tokens
}
