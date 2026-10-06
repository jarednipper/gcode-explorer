import { describe, expect, it } from 'vitest'
import { StreamingLines } from './streaming-lines'

describe('StreamingLines', () => {
  it('emits complete lines without waiting for end of file', () => {
    const parser = new StreamingLines()

    expect(
      parser.push(new TextEncoder().encode('first\nsecond\npartial')),
    ).toEqual(['first', 'second'])
    expect(parser.finish()).toEqual(['partial'])
  })

  it('handles CRLF and multibyte characters split between chunks', () => {
    const parser = new StreamingLines()
    const bytes = new TextEncoder().encode('first\r\nsnowman ☃\n')

    expect(parser.push(bytes.subarray(0, 8))).toEqual(['first'])
    expect(parser.push(bytes.subarray(8))).toEqual(['snowman ☃'])
    expect(parser.finish()).toEqual([''])
  })

  it('preserves an empty final line and handles an empty file', () => {
    const endedWithNewline = new StreamingLines()
    const empty = new StreamingLines()

    expect(endedWithNewline.push(new TextEncoder().encode('line\n'))).toEqual([
      'line',
    ])
    expect(endedWithNewline.finish()).toEqual([''])
    expect(empty.finish()).toEqual([''])
  })
})
