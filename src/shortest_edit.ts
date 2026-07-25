/** @internal */
export interface EditRange {
  start: number
  end: number
}

/** @internal */
export interface ShortestEdit {
  before: EditRange[]
  after: EditRange[]
}

interface Character {
  value: string
  start: number
  end: number
}

/** @internal */
export function shortestEdit(before: string, after: string): ShortestEdit {
  const beforeCharacters = characters(before)
  const afterCharacters = characters(after)
  let prefixLength = 0
  while (
    prefixLength < beforeCharacters.length &&
    prefixLength < afterCharacters.length &&
    beforeCharacters[prefixLength]?.value ===
      afterCharacters[prefixLength]?.value
  ) {
    prefixLength++
  }
  let suffixLength = 0
  while (
    suffixLength < beforeCharacters.length - prefixLength &&
    suffixLength < afterCharacters.length - prefixLength &&
    beforeCharacters[beforeCharacters.length - suffixLength - 1]?.value ===
      afterCharacters[afterCharacters.length - suffixLength - 1]?.value
  ) {
    suffixLength++
  }
  const beforeMiddle = beforeCharacters.slice(
    prefixLength,
    beforeCharacters.length - suffixLength,
  )
  const afterMiddle = afterCharacters.slice(
    prefixLength,
    afterCharacters.length - suffixLength,
  )
  const distances = Array.from(
    { length: beforeMiddle.length + 1 },
    (_, beforeIndex) =>
      Array.from({ length: afterMiddle.length + 1 }, (_, afterIndex) =>
        beforeIndex === 0 ? afterIndex : afterIndex === 0 ? beforeIndex : 0,
      ),
  )

  for (let beforeIndex = 1; beforeIndex <= beforeMiddle.length; beforeIndex++) {
    for (let afterIndex = 1; afterIndex <= afterMiddle.length; afterIndex++) {
      const substitutionCost =
        beforeMiddle[beforeIndex - 1]?.value ===
        afterMiddle[afterIndex - 1]?.value
          ? 0
          : 1
      distances[beforeIndex]![afterIndex] = Math.min(
        distances[beforeIndex - 1]![afterIndex]! + 1,
        distances[beforeIndex]![afterIndex - 1]! + 1,
        distances[beforeIndex - 1]![afterIndex - 1]! + substitutionCost,
      )
    }
  }

  const changedBefore = new Set<number>()
  const changedAfter = new Set<number>()
  let beforeIndex = beforeMiddle.length
  let afterIndex = afterMiddle.length
  while (beforeIndex > 0 || afterIndex > 0) {
    const beforeCharacter = beforeMiddle[beforeIndex - 1]
    const afterCharacter = afterMiddle[afterIndex - 1]
    if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      beforeCharacter?.value === afterCharacter?.value &&
      distances[beforeIndex]![afterIndex] ===
        distances[beforeIndex - 1]![afterIndex - 1]
    ) {
      beforeIndex--
      afterIndex--
    } else if (
      beforeIndex > 0 &&
      afterIndex > 0 &&
      distances[beforeIndex]![afterIndex] ===
        distances[beforeIndex - 1]![afterIndex - 1]! + 1
    ) {
      changedBefore.add(prefixLength + --beforeIndex)
      changedAfter.add(prefixLength + --afterIndex)
    } else if (
      beforeIndex > 0 &&
      distances[beforeIndex]![afterIndex] ===
        distances[beforeIndex - 1]![afterIndex]! + 1
    ) {
      changedBefore.add(prefixLength + --beforeIndex)
    } else {
      changedAfter.add(prefixLength + --afterIndex)
    }
  }

  return {
    before: ranges(beforeCharacters, changedBefore),
    after: ranges(afterCharacters, changedAfter),
  }
}

function characters(text: string): Character[] {
  const result: Character[] = []
  let start = 0
  for (const value of text) {
    const end = start + value.length
    result.push({ value, start, end })
    start = end
  }
  return result
}

function ranges(
  characters: readonly Character[],
  changed: ReadonlySet<number>,
): EditRange[] {
  const result: EditRange[] = []
  for (const index of [...changed].sort((left, right) => left - right)) {
    const character = characters[index]
    if (character === undefined) continue
    const previous = result.at(-1)
    if (previous?.end === character.start) {
      previous.end = character.end
    } else {
      result.push({ start: character.start, end: character.end })
    }
  }
  return result
}
