import { describe, expect, it } from 'vitest'
import { getVirtualWindow } from './virtual-window'

describe('getVirtualWindow', () => {
  it('keeps the mounted row count bounded for a large file', () => {
    const window = getVirtualWindow(385_320, 1_024_000, 640, 32, 100)

    expect(window.start).toBe(32_000)
    expect(window.end).toBe(32_100)
    expect(window.end - window.start).toBe(100)
    expect(window.totalSize).toBe(12_330_240)
  })

  it('keeps a 100-row window containing the visible rows', () => {
    expect(getVirtualWindow(1000, 64, 96, 32, 100)).toEqual({
      start: 2,
      end: 102,
      totalSize: 32_000,
    })
  })

  it('uses the whole file when it has fewer rows than the window', () => {
    expect(getVirtualWindow(10, 0, 96, 32, 100)).toEqual({
      start: 0,
      end: 10,
      totalSize: 320,
    })
  })

  it('clamps the window for empty files, negative offsets, and end-of-file', () => {
    expect(getVirtualWindow(0, 0, 100, 32, 100)).toEqual({
      start: 0,
      end: 0,
      totalSize: 0,
    })
    expect(getVirtualWindow(10, -100, 96, 32, 100)).toEqual({
      start: 0,
      end: 10,
      totalSize: 320,
    })
    expect(getVirtualWindow(10, 1000, 96, 32, 100)).toEqual({
      start: 0,
      end: 10,
      totalSize: 320,
    })
  })
})
