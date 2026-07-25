import { describe, expect, it } from 'vitest'
import { shortestEdit } from '../src/shortest_edit.js'

describe('shortestEdit', () => {
  it('finds unchanged and substituted characters', () => {
    expect(shortestEdit('import type', 'import value')).toEqual({
      before: [{ start: 7, end: 10 }],
      after: [{ start: 7, end: 11 }],
    })
  })

  it('finds inserted and deleted characters', () => {
    expect(shortestEdit('import type { T }', 'import { T }')).toEqual({
      before: [{ start: 7, end: 12 }],
      after: [],
    })
    expect(shortestEdit('ab', 'a😀b')).toEqual({
      before: [],
      after: [{ start: 1, end: 3 }],
    })
  })
})
