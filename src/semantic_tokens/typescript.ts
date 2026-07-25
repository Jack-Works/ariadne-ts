import type * as ts from 'typescript'
import { AbsoluteSemanticToken, encodeSemanticTokens } from './encode.js'
import { javascriptLanguage } from './language.js'

type TypeScriptImports = typeof import('typescript')

export function create_semantic_token_from_typescript_ast(
  imports: TypeScriptImports,
): (
  sourceText: string,
  language: string,
  start_line: number,
  end_line: number,
) => number[] {
  return (sourceText, language, startLine, endLine) => {
    const normalizedLanguage = javascriptLanguage(language)
    if (normalizedLanguage === undefined) return []
    const sourceFile = imports.createSourceFile(
      normalizedLanguage === 'typescript' ? 'source.ts' : 'source.js',
      sourceText,
      imports.ScriptTarget.Latest,
      true,
    )

    const tokens: AbsoluteSemanticToken[] = []
    addLexicalTokens(sourceFile, imports, tokens)
    const visit = (node: ts.Node, parent: ts.Node | undefined): void => {
      const token = classifyNode(node, parent, sourceFile, imports)
      if (token !== undefined) tokens.push(token)
      imports.forEachChild(node, (child) => visit(child, node))
    }
    visit(sourceFile, undefined)
    return encodeSemanticTokens(tokens, startLine, endLine)
  }
}

function addLexicalTokens(
  sourceFile: ts.SourceFile,
  imports: TypeScriptImports,
  tokens: AbsoluteSemanticToken[],
): void {
  const scanner = imports.createScanner(
    sourceFile.languageVersion,
    false,
    sourceFile.languageVariant,
    sourceFile.text,
  )

  for (
    let kind = scanner.scan();
    kind !== imports.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    const tokenType =
      kind >= imports.SyntaxKind.FirstKeyword &&
      kind <= imports.SyntaxKind.LastKeyword
        ? ('keyword' as const)
        : kind === imports.SyntaxKind.SingleLineCommentTrivia ||
            kind === imports.SyntaxKind.MultiLineCommentTrivia
          ? ('comment' as const)
          : kind >= imports.SyntaxKind.FirstBinaryOperator &&
              kind <= imports.SyntaxKind.LastBinaryOperator
            ? ('operator' as const)
            : undefined
    if (tokenType === undefined) continue

    const start = scanner.getTokenStart()
    const end = scanner.getTokenEnd()
    const tokenModifiers =
      tokenType === 'comment' &&
      sourceFile.text.slice(start, end).startsWith('/**')
        ? (['documentation'] as const)
        : undefined
    addTokenRange(sourceFile, start, end, tokenType, tokenModifiers, tokens)
  }
}

function addTokenRange(
  sourceFile: ts.SourceFile,
  start: number,
  end: number,
  tokenType: AbsoluteSemanticToken['tokenType'],
  tokenModifiers: AbsoluteSemanticToken['tokenModifiers'],
  tokens: AbsoluteSemanticToken[],
): void {
  let offset = start
  while (offset < end) {
    const position = sourceFile.getLineAndCharacterOfPosition(offset)
    const lineEnd = Math.min(sourceFile.getLineEndOfPosition(offset), end)
    if (lineEnd > offset) {
      tokens.push({
        line: position.line,
        start: position.character,
        length: lineEnd - offset,
        tokenType,
        ...(tokenModifiers === undefined ? {} : { tokenModifiers }),
      })
    }
    if (lineEnd === end) return
    offset = sourceFile.getPositionOfLineAndCharacter(position.line + 1, 0)
  }
}

function classifyNode(
  node: ts.Node,
  parent: ts.Node | undefined,
  sourceFile: ts.SourceFile,
  imports: TypeScriptImports,
): AbsoluteSemanticToken | undefined {
  let tokenType: AbsoluteSemanticToken['tokenType'] | undefined
  let tokenModifiers: AbsoluteSemanticToken['tokenModifiers']

  if (imports.isIdentifier(node)) {
    const classification = classifyIdentifier(node, parent, imports)
    tokenType = classification.tokenType
    tokenModifiers = classification.tokenModifiers
  } else if (imports.isStringLiteralLike(node)) {
    tokenType = 'string'
  } else if (
    imports.isNumericLiteral(node) ||
    node.kind === imports.SyntaxKind.BigIntLiteral
  ) {
    tokenType = 'number'
  } else if (imports.isRegularExpressionLiteral(node)) {
    tokenType = 'regexp'
  } else {
    return undefined
  }

  const start = node.getStart(sourceFile)
  const end = node.getEnd()
  const startPosition = sourceFile.getLineAndCharacterOfPosition(start)
  const endPosition = sourceFile.getLineAndCharacterOfPosition(end)
  if (startPosition.line !== endPosition.line) return undefined

  return {
    line: startPosition.line,
    start: startPosition.character,
    length: endPosition.character - startPosition.character,
    tokenType,
    ...(tokenModifiers === undefined ? {} : { tokenModifiers }),
  }
}

function classifyIdentifier(
  node: ts.Identifier,
  parent: ts.Node | undefined,
  imports: TypeScriptImports,
): Pick<AbsoluteSemanticToken, 'tokenType' | 'tokenModifiers'> {
  if (parent === undefined) return { tokenType: 'variable' }

  const declaration = ['declaration'] as const
  const modifiers = declarationModifiers(parent, imports)
  const isName = isNamedDeclarationName(parent, node)

  switch (parent.kind) {
    case imports.SyntaxKind.ClassDeclaration:
    case imports.SyntaxKind.ClassExpression:
      return {
        tokenType: 'class',
        tokenModifiers: isName ? [...declaration, ...modifiers] : modifiers,
      }
    case imports.SyntaxKind.InterfaceDeclaration:
      return {
        tokenType: 'interface',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.TypeAliasDeclaration:
      return {
        tokenType: 'type',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.EnumDeclaration:
      return {
        tokenType: 'enum',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.TypeParameter:
      return {
        tokenType: 'typeParameter',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.Parameter:
      return {
        tokenType: 'parameter',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.FunctionDeclaration:
    case imports.SyntaxKind.FunctionExpression:
      return {
        tokenType: 'function',
        tokenModifiers: isName ? [...declaration, ...modifiers] : modifiers,
      }
    case imports.SyntaxKind.MethodDeclaration:
    case imports.SyntaxKind.MethodSignature:
      return {
        tokenType: 'method',
        tokenModifiers: isName ? [...declaration, ...modifiers] : modifiers,
      }
    case imports.SyntaxKind.PropertyDeclaration:
    case imports.SyntaxKind.PropertySignature:
    case imports.SyntaxKind.PropertyAssignment:
      return {
        tokenType: 'property',
        tokenModifiers: isName ? [...declaration, ...modifiers] : modifiers,
      }
    case imports.SyntaxKind.VariableDeclaration:
    case imports.SyntaxKind.BindingElement:
      return {
        tokenType: 'variable',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.EnumMember:
      return {
        tokenType: 'enumMember',
        tokenModifiers: isName ? declaration : undefined,
      }
    case imports.SyntaxKind.TypeReference:
    case imports.SyntaxKind.ExpressionWithTypeArguments:
    case imports.SyntaxKind.TypeQuery:
      return { tokenType: 'type' }
    case imports.SyntaxKind.PropertyAccessExpression:
      return isNamedDeclarationName(parent, node)
        ? { tokenType: 'property' }
        : { tokenType: 'variable' }
    case imports.SyntaxKind.QualifiedName:
      return { tokenType: 'type' }
    case imports.SyntaxKind.ImportSpecifier:
    case imports.SyntaxKind.ImportClause:
    case imports.SyntaxKind.NamespaceImport:
      return {
        tokenType: 'variable',
        tokenModifiers: isName ? declaration : undefined,
      }
    default:
      return { tokenType: 'variable' }
  }
}

function isNamedDeclarationName(node: ts.Node, name: ts.Identifier): boolean {
  return 'name' in node && node.name === name
}

function declarationModifiers(
  node: ts.Node,
  imports: TypeScriptImports,
): readonly ('abstract' | 'async' | 'readonly' | 'static')[] {
  if (!imports.canHaveModifiers(node)) return []
  return (imports.getModifiers(node) ?? []).flatMap((modifier) => {
    switch (modifier.kind) {
      case imports.SyntaxKind.ReadonlyKeyword:
        return ['readonly'] as const
      case imports.SyntaxKind.StaticKeyword:
        return ['static'] as const
      case imports.SyntaxKind.AbstractKeyword:
        return ['abstract'] as const
      case imports.SyntaxKind.AsyncKeyword:
        return ['async'] as const
      default:
        return []
    }
  })
}
