import type * as Babel from '@babel/types'
import type * as ESTree from 'estree'
import { semanticTokensFromJavaScriptAST } from './javascript_ast.js'
import { javascriptLanguage } from './language.js'

export interface JavaScriptASTSemanticTokenImports {
  visitorKeys: Readonly<Record<string, readonly string[]>>
}

export function create_semantic_token_from_estree_ast(
  create_ast: (
    sourceText: string,
  ) => ESTree.Program | Babel.File | Babel.Program | undefined,
  imports: JavaScriptASTSemanticTokenImports,
): (
  sourceText: string,
  language: string,
  start_line: number,
  end_line: number,
) => number[] {
  return (sourceText, language, startLine, endLine) => {
    if (javascriptLanguage(language) === undefined) return []
    const ast = create_ast(sourceText)
    if (ast === undefined) return []
    return semanticTokensFromJavaScriptAST(
      ast,
      imports.visitorKeys,
      startLine,
      endLine,
    )
  }
}
