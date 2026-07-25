import { parse as parseBabel } from '@babel/parser'
import * as babelTypes from '@babel/types'
import type * as ESTree from 'estree'
import { KEYS } from 'eslint-visitor-keys'
import { parse as parseESTree } from 'espree'
import * as typescript from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  create_semantic_token_from_estree_ast,
  create_semantic_token_from_typescript_ast,
  semanticTokenModifiers,
  semanticTokenTypes,
} from '../src/index.js'
import { decodeSemanticTokens } from '../src/semantic_tokens.js'

const javascriptSource = `const answer = 42;
// greeting
function greet(name) { return "hi" + name; }`

const capability = {
  tokenTypes: [...semanticTokenTypes],
  tokenModifiers: [...semanticTokenModifiers],
}

describe('semantic token AST helpers', () => {
  it('creates ranged tokens from a TypeScript AST', () => {
    const typescriptSource = `export function main() {
  /** documentation */
  throw new Error("hey!" + message)
}`
    const provider = create_semantic_token_from_typescript_ast(typescript)

    const data = provider(typescriptSource, 'TyPeScRiPt', 0, 4)
    const tokens = decodeSemanticTokens(data, capability)

    expect(data.length).toBeGreaterThan(0)
    expect(data.length % 5).toBe(0)
    expect(tokens.map((token) => token.tokenType)).toEqual([
      'keyword',
      'keyword',
      'function',
      'comment',
      'keyword',
      'keyword',
      'variable',
      'string',
      'operator',
      'variable',
    ])
    expect(
      tokens.find((token) => token.tokenType === 'comment')?.tokenModifiers,
    ).toEqual(['documentation'])
    expect(tokens).toMatchSnapshot()
    expect(provider(typescriptSource, 'ts', 1, 3)).toMatchSnapshot(
      'ranged delta tuples',
    )
    expect(provider(typescriptSource, 'python', 0, 4)).toEqual([])
  })

  it('creates the same tokens from ESTree and Babel ASTs', () => {
    const provideESTree = create_semantic_token_from_estree_ast(
      (sourceText) =>
        parseESTree(sourceText, {
          ecmaVersion: 'latest',
          loc: true,
          sourceType: 'module',
          tokens: true,
          comment: true,
        }) as ESTree.Program,
      { visitorKeys: KEYS },
    )
    const provideBabel = create_semantic_token_from_estree_ast(
      (sourceText) =>
        parseBabel(sourceText, {
          sourceType: 'module',
          tokens: true,
        }),
      { visitorKeys: babelTypes.VISITOR_KEYS },
    )

    const estreeData = provideESTree(javascriptSource, 'ECMAScript', 0, 3)
    const babelData = provideBabel(javascriptSource, 'js', 0, 3)
    const tokenTypes = decodeSemanticTokens(estreeData, capability).map(
      (token) => token.tokenType,
    )

    expect(estreeData.length).toBeGreaterThan(0)
    expect(babelData.length).toBeGreaterThan(0)
    expect(babelData).toEqual(estreeData)
    expect(tokenTypes).toContain('keyword')
    expect(tokenTypes).toContain('comment')
    expect(tokenTypes).toContain('operator')
    expect(decodeSemanticTokens(estreeData, capability)).toMatchSnapshot()
    expect(provideESTree(javascriptSource, 'jsx', 0, 3)).toEqual([])
    expect(provideBabel(javascriptSource, '', 0, 3)).toEqual([])
  })
})
