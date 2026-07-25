import {
  semanticTokenModifiers,
  semanticTokenTypes,
} from '../semantic_tokens.js'

/** @internal */
export interface AbsoluteSemanticToken {
  line: number
  start: number
  length: number
  tokenType: (typeof semanticTokenTypes)[number]
  tokenModifiers?: readonly (typeof semanticTokenModifiers)[number][]
}

/** @internal */
export function encodeSemanticTokens(
  tokens: readonly AbsoluteSemanticToken[],
  startLine: number,
  endLine: number,
): number[] {
  const sorted = tokens
    .filter(
      (token) =>
        token.line >= startLine &&
        token.line < endLine &&
        token.length > 0 &&
        Number.isSafeInteger(token.line) &&
        Number.isSafeInteger(token.start) &&
        Number.isSafeInteger(token.length),
    )
    .sort((left, right) => left.line - right.line || left.start - right.start)

  const encoded: number[] = []
  let previousLine = 0
  let previousStart = 0
  let previousEnd = -1

  for (const token of sorted) {
    if (token.start < 0) continue
    if (token.line === previousLine && token.start < previousEnd) continue

    const tokenType = semanticTokenTypes.indexOf(token.tokenType)
    const modifierBits = (token.tokenModifiers ?? []).reduce(
      (bits, modifier) => {
        const index = semanticTokenModifiers.indexOf(modifier)
        return index < 0 ? bits : bits + 2 ** index
      },
      0,
    )
    const deltaLine = token.line - previousLine
    const deltaStart =
      deltaLine === 0 ? token.start - previousStart : token.start
    encoded.push(deltaLine, deltaStart, token.length, tokenType, modifierBits)
    previousLine = token.line
    previousStart = token.start
    previousEnd = token.start + token.length
  }

  return encoded
}
