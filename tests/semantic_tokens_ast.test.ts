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
    const filename = 'example.ts'
    const typescriptSource = `export function main() {
  /** documentation */
  throw new Error("hey!" + message)
}`
    const sourceFile = typescript.createSourceFile(
      filename,
      typescriptSource,
      typescript.ScriptTarget.Latest,
      true,
    )
    const provide = create_semantic_token_from_typescript_ast(
      (requestedFilename) =>
        requestedFilename === filename ? sourceFile : undefined,
      typescript,
    )

    const data = provide(filename, 0, 4)
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
    expect(provide(filename, 1, 3)).toMatchSnapshot('ranged delta tuples')
    expect(provide('missing.ts', 0, 4)).toEqual([])
  })

  it('creates the same tokens from ESTree and Babel ASTs', () => {
    const filename = 'example.js'
    const estreeAST = parseESTree(javascriptSource, {
      ecmaVersion: 'latest',
      loc: true,
      sourceType: 'module',
      tokens: true,
      comment: true,
    }) as ESTree.Program
    const babelAST = parseBabel(javascriptSource, {
      sourceType: 'module',
      tokens: true,
    })
    const provideESTree = create_semantic_token_from_estree_ast(
      (requestedFilename) =>
        requestedFilename === filename ? estreeAST : undefined,
      { visitorKeys: KEYS },
    )
    const provideBabel = create_semantic_token_from_estree_ast(
      (requestedFilename) =>
        requestedFilename === filename ? babelAST : undefined,
      { visitorKeys: babelTypes.VISITOR_KEYS },
    )

    const estreeData = provideESTree(filename, 0, 3)
    const babelData = provideBabel(filename, 0, 3)
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
  })
})
