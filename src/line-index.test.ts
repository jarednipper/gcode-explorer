import { describe, expect, it } from 'vitest'
import { ByteLineIndex } from './line-index'

function appendTextInChunks(
  index: ByteLineIndex,
  text: string,
  chunkSize: number,
): void {
  const bytes = new TextEncoder().encode(text)
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    index.append(bytes.subarray(offset, offset + chunkSize))
  }
}

describe('ByteLineIndex', () => {
  it('indexes LF and CRLF lines when delimiters cross chunk boundaries', () => {
    const index = new ByteLineIndex()
    appendTextInChunks(index, 'first\r\nsecond\nthird', 5)

    expect(index.lineCount).toBe(3)
    expect(index.getRange(0, 1)).toEqual([0, 7])
    expect(index.getRange(1, 3)).toEqual([7, 19])
  })

  it('preserves a final empty line when the file ends with a newline', () => {
    const index = new ByteLineIndex()
    appendTextInChunks(index, 'first\n', 2)

    expect(index.lineCount).toBe(2)
    expect(index.getRange(0, 2)).toEqual([0, 6])
    expect(index.getRange(1, 2)).toEqual([6, 6])
  })

  it('indexes an empty file and a final line without a newline', () => {
    const emptyIndex = new ByteLineIndex()
    const nonEmptyIndex = new ByteLineIndex()
    appendTextInChunks(nonEmptyIndex, 'last line', 3)

    expect(emptyIndex.lineCount).toBe(1)
    expect(emptyIndex.getRange(0, 1)).toEqual([0, 0])
    expect(nonEmptyIndex.lineCount).toBe(1)
    expect(nonEmptyIndex.getRange(0, 1)).toEqual([0, 9])
  })

  it('rejects invalid line ranges', () => {
    const index = new ByteLineIndex()
    expect(() => index.getRange(0, 2)).toThrow(RangeError)
  })
})
