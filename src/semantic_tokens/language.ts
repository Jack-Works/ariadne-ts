/** @internal */
export type JavaScriptLanguage = 'javascript' | 'typescript'

/** @internal */
export function javascriptLanguage(
  language: string,
): JavaScriptLanguage | undefined {
  switch (language.toLowerCase()) {
    case 'js':
    case 'javascript':
    case 'ecmascript':
      return 'javascript'
    case 'ts':
    case 'typescript':
      return 'typescript'
    default:
      return undefined
  }
}
