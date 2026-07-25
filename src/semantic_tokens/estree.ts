import type * as Babel from '@babel/types'
import type * as ESTree from 'estree'
import {
  semanticTokensFromJavaScriptAST,
  VisitorKeys,
} from './javascript_ast.js'

export interface JavaScriptASTSemanticTokenImports {
  visitorKeys: VisitorKeys
}

export function create_semantic_token_from_estree_ast(
  get_ast: (
    source_file: string,
  ) => ESTree.Program | Babel.File | Babel.Program | undefined,
  imports: JavaScriptASTSemanticTokenImports,
): (filename: string, start_line: number, end_line: number) => number[] {
  return (filename, startLine, endLine) => {
    const ast = get_ast(filename)
    if (ast === undefined) return []
    return semanticTokensFromJavaScriptAST(
      ast,
      imports.visitorKeys,
      startLine,
      endLine,
    )
  }
}
