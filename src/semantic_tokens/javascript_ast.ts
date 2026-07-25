import { AbsoluteSemanticToken, encodeSemanticTokens } from './encode.js'

export interface JavaScriptASTNode {
  type: string
  loc?: {
    start: { line: number; column: number }
    end: { line: number; column: number }
  } | null
}

export type VisitorKeys = Readonly<Record<string, readonly string[]>>

interface TraversalNode extends JavaScriptASTNode {
  [key: string]: unknown
}

export function semanticTokensFromJavaScriptAST(
  root: JavaScriptASTNode,
  visitorKeys: VisitorKeys,
  startLine: number,
  endLine: number,
): number[] {
  const tokens: AbsoluteSemanticToken[] = []
  addLexicalTokens(root as TraversalNode, tokens)

  const visit = (
    node: TraversalNode,
    parent: TraversalNode | undefined,
    parentKey: string | undefined,
  ): void => {
    const token = classify(node, parent, parentKey)
    if (token !== undefined) tokens.push(token)

    for (const key of visitorKeys[node.type] ?? []) {
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          if (isNode(item)) visit(item, node, key)
        }
      } else if (isNode(child)) {
        visit(child, node, key)
      }
    }
  }

  visit(root as TraversalNode, undefined, undefined)
  return encodeSemanticTokens(tokens, startLine, endLine)
}

function addLexicalTokens(
  root: TraversalNode,
  tokens: AbsoluteSemanticToken[],
): void {
  const lexicalTokens = [
    ...(Array.isArray(root.tokens) ? root.tokens : []),
    ...(Array.isArray(root.comments) ? root.comments : []),
  ]
  for (const value of lexicalTokens) {
    const token = classifyLexicalToken(value)
    if (token !== undefined) tokens.push(token)
  }
}

function classifyLexicalToken(
  value: unknown,
): AbsoluteSemanticToken | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const token = value as Record<string, unknown>
  const position = lexicalTokenPosition(token)
  if (position === undefined) return undefined

  const type = token.type
  const typeName = typeof type === 'string' ? type : undefined
  const typeInfo =
    typeof type === 'object' && type !== null
      ? (type as Record<string, unknown>)
      : undefined
  const tokenValue = typeof token.value === 'string' ? token.value : undefined
  const isComment =
    typeName === 'CommentBlock' ||
    typeName === 'CommentLine' ||
    typeName === 'Block' ||
    typeName === 'Line'

  if (isComment) {
    const isDocumentation =
      (typeName === 'CommentBlock' || typeName === 'Block') &&
      tokenValue?.startsWith('*')
    return {
      ...position,
      tokenType: 'comment',
      ...(isDocumentation ? { tokenModifiers: ['documentation'] } : {}),
    }
  }
  if (
    typeName === 'Keyword' ||
    typeof typeInfo?.keyword === 'string' ||
    (typeInfo?.label === 'name' &&
      tokenValue !== undefined &&
      contextualKeywordValues.has(tokenValue))
  ) {
    return { ...position, tokenType: 'keyword' }
  }
  if (
    (typeName === 'Punctuator' && isOperator(tokenValue)) ||
    typeInfo?.isAssign === true ||
    typeof typeInfo?.binop === 'number' ||
    typeInfo?.prefix === true ||
    typeInfo?.postfix === true
  ) {
    return { ...position, tokenType: 'operator' }
  }
  return undefined
}

function lexicalTokenPosition(
  token: Record<string, unknown>,
): Pick<AbsoluteSemanticToken, 'line' | 'start' | 'length'> | undefined {
  const location = token.loc
  if (typeof location !== 'object' || location === null) return undefined
  const { start, end } = location as Record<string, unknown>
  if (
    typeof start !== 'object' ||
    start === null ||
    typeof end !== 'object' ||
    end === null
  ) {
    return undefined
  }
  const startPosition = start as Record<string, unknown>
  const endPosition = end as Record<string, unknown>
  if (
    typeof startPosition.line !== 'number' ||
    typeof startPosition.column !== 'number' ||
    typeof endPosition.line !== 'number' ||
    typeof endPosition.column !== 'number' ||
    startPosition.line !== endPosition.line
  ) {
    return undefined
  }
  return {
    line: startPosition.line - 1,
    start: startPosition.column,
    length: endPosition.column - startPosition.column,
  }
}

const operatorValues = new Set([
  '<',
  '>',
  '<=',
  '>=',
  '==',
  '!=',
  '===',
  '!==',
  '=>',
  '+',
  '-',
  '*',
  '**',
  '/',
  '%',
  '++',
  '--',
  '<<',
  '>>',
  '>>>',
  '&',
  '|',
  '^',
  '!',
  '~',
  '&&',
  '||',
  '??',
  '?',
  ':',
  '=',
  '+=',
  '-=',
  '*=',
  '**=',
  '/=',
  '%=',
  '<<=',
  '>>=',
  '>>>=',
  '&=',
  '|=',
  '^=',
  '&&=',
  '||=',
  '??=',
])

const contextualKeywordValues = new Set([
  'as',
  'assert',
  'async',
  'await',
  'declare',
  'from',
  'get',
  'infer',
  'is',
  'keyof',
  'of',
  'override',
  'readonly',
  'satisfies',
  'set',
  'type',
  'using',
])

function isOperator(value: string | undefined): boolean {
  return value !== undefined && operatorValues.has(value)
}

function classify(
  node: TraversalNode,
  parent: TraversalNode | undefined,
  parentKey: string | undefined,
): AbsoluteSemanticToken | undefined {
  const position = singleLinePosition(node)
  if (position === undefined) return undefined

  if (node.type === 'Identifier' || node.type === 'PrivateIdentifier') {
    const classification = classifyIdentifier(parent, parentKey)
    return { ...position, ...classification }
  }
  if (
    node.type === 'StringLiteral' ||
    node.type === 'DirectiveLiteral' ||
    node.type === 'TemplateElement'
  ) {
    return { ...position, tokenType: 'string' }
  }
  if (
    node.type === 'NumericLiteral' ||
    node.type === 'BigIntLiteral' ||
    node.type === 'DecimalLiteral'
  ) {
    return { ...position, tokenType: 'number' }
  }
  if (node.type === 'RegExpLiteral') {
    return { ...position, tokenType: 'regexp' }
  }
  if (node.type === 'Literal') {
    if (node.regex !== undefined) return { ...position, tokenType: 'regexp' }
    if (typeof node.value === 'string') {
      return { ...position, tokenType: 'string' }
    }
    if (typeof node.value === 'number' || typeof node.value === 'bigint') {
      return { ...position, tokenType: 'number' }
    }
  }
  return undefined
}

function classifyIdentifier(
  parent: TraversalNode | undefined,
  parentKey: string | undefined,
): Pick<AbsoluteSemanticToken, 'tokenType' | 'tokenModifiers'> {
  if (parent === undefined) return { tokenType: 'variable' }

  const declaration = ['declaration'] as const
  const modifiers = [
    ...(parent.static === true ? (['static'] as const) : []),
    ...(parent.async === true ? (['async'] as const) : []),
  ]

  if (
    (parent.type === 'ClassDeclaration' || parent.type === 'ClassExpression') &&
    parentKey === 'id'
  ) {
    return {
      tokenType: 'class',
      tokenModifiers: [...declaration, ...modifiers],
    }
  }
  if (
    (parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression') &&
    parentKey === 'id'
  ) {
    return {
      tokenType: 'function',
      tokenModifiers: [...declaration, ...modifiers],
    }
  }
  if (parent.type === 'VariableDeclarator' && parentKey === 'id') {
    return { tokenType: 'variable', tokenModifiers: declaration }
  }
  if (
    (parent.type === 'FunctionDeclaration' ||
      parent.type === 'FunctionExpression' ||
      parent.type === 'ArrowFunctionExpression') &&
    parentKey === 'params'
  ) {
    return { tokenType: 'parameter', tokenModifiers: declaration }
  }
  if (
    (parent.type === 'MethodDefinition' ||
      parent.type === 'ClassMethod' ||
      parent.type === 'ObjectMethod') &&
    parentKey === 'key'
  ) {
    return {
      tokenType: 'method',
      tokenModifiers: [...declaration, ...modifiers],
    }
  }
  if (
    (parent.type === 'Property' ||
      parent.type === 'PropertyDefinition' ||
      parent.type === 'ClassProperty' ||
      parent.type === 'ObjectProperty') &&
    parentKey === 'key'
  ) {
    return {
      tokenType: 'property',
      tokenModifiers: [...declaration, ...modifiers],
    }
  }
  if (
    parent.type === 'MemberExpression' &&
    parentKey === 'property' &&
    parent.computed !== true
  ) {
    return { tokenType: 'property' }
  }
  if (
    (parent.type === 'ImportSpecifier' ||
      parent.type === 'ImportDefaultSpecifier' ||
      parent.type === 'ImportNamespaceSpecifier') &&
    parentKey === 'local'
  ) {
    return { tokenType: 'variable', tokenModifiers: declaration }
  }
  if (parent.type === 'TSInterfaceDeclaration' && parentKey === 'id') {
    return { tokenType: 'interface', tokenModifiers: declaration }
  }
  if (parent.type === 'TSTypeAliasDeclaration' && parentKey === 'id') {
    return { tokenType: 'type', tokenModifiers: declaration }
  }
  if (parent.type === 'TSEnumDeclaration' && parentKey === 'id') {
    return { tokenType: 'enum', tokenModifiers: declaration }
  }
  if (
    (parent.type === 'TSTypeReference' ||
      parent.type === 'TSExpressionWithTypeArguments') &&
    (parentKey === 'typeName' || parentKey === 'expression')
  ) {
    return { tokenType: 'type' }
  }
  return { tokenType: 'variable' }
}

function singleLinePosition(
  node: JavaScriptASTNode,
): Pick<AbsoluteSemanticToken, 'line' | 'start' | 'length'> | undefined {
  const location = node.loc
  if (
    location === undefined ||
    location === null ||
    location.start.line !== location.end.line
  ) {
    return undefined
  }
  return {
    line: location.start.line - 1,
    start: location.start.column,
    length: location.end.column - location.start.column,
  }
}

function isNode(value: unknown): value is TraversalNode {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof value.type === 'string'
  )
}
