export interface VirtualWindow {
  start: number
  end: number
  totalSize: number
}

export function getVirtualWindow(
  count: number,
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  windowSize: number,
): VirtualWindow {
  const safeCount = Math.max(0, Math.floor(count))
  const safeRowHeight = Math.max(1, rowHeight)
  const firstVisible = Math.floor(Math.max(0, scrollTop) / safeRowHeight)
  const lastVisible = Math.min(
    safeCount,
    Math.ceil(
      (Math.max(0, scrollTop) + Math.max(0, viewportHeight)) / safeRowHeight,
    ),
  )
  const safeWindowSize = Math.max(1, Math.floor(windowSize))
  const start = Math.min(firstVisible, Math.max(0, safeCount - safeWindowSize))
  const end = Math.min(safeCount, Math.max(lastVisible, start + safeWindowSize))

  return {
    start,
    end,
    totalSize: safeCount * safeRowHeight,
  }
}
