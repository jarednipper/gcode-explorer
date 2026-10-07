/// <reference lib="webworker" />

import { explainGcodeLine } from './gcode'
import { GcodeMotionIndex } from './gcode-motion'
import { ByteLineIndex } from './line-index'
import { StreamingLines } from './streaming-lines'

interface LoadMessage {
  type: 'load'
  requestId: number
  file: File
}

interface ReadMessage {
  type: 'read'
  requestId: number
  startLine: number
  endLine: number
}

type WorkerRequest = LoadMessage | ReadMessage

let activeRequestId = 0
let activeFile: File | undefined
let activeIndex: ByteLineIndex | undefined
let availableLineCount = 0
const chunkSize = 64 * 1024

function yieldToWorkerQueue(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

async function indexFile(request: LoadMessage): Promise<void> {
  const index = new ByteLineIndex()
  const parser = new StreamingLines()
  const motionIndex = new GcodeMotionIndex()
  activeFile = request.file
  activeIndex = index
  availableLineCount = 0

  try {
    for (let offset = 0; offset < request.file.size; offset += chunkSize) {
      if (request.requestId !== activeRequestId) return

      const chunk = new Uint8Array(
        await request.file.slice(offset, offset + chunkSize).arrayBuffer(),
      )
      if (request.requestId !== activeRequestId) return

      index.append(chunk)
      const lines = parser.push(chunk)
      lines.forEach((line, offset) =>
        motionIndex.addLine(line, availableLineCount + offset),
      )
      availableLineCount += lines.length
      self.postMessage({
        type: 'progress',
        requestId: request.requestId,
        loadedBytes: index.fileSize,
        totalBytes: request.file.size,
        availableLineCount,
      })
      await yieldToWorkerQueue()
    }

    if (request.requestId !== activeRequestId) return

    const finalLines = parser.finish()
    finalLines.forEach((line, offset) =>
      motionIndex.addLine(line, availableLineCount + offset),
    )
    availableLineCount += finalLines.length
    activeFile = request.file
    activeIndex = index
    const path = motionIndex.toPathData()
    self.postMessage({ type: 'path', requestId: request.requestId, ...path }, [
      path.coordinates.buffer,
      path.lineIndices.buffer,
      path.extruding.buffer,
      path.zPositions.buffer,
      path.zLineIndices.buffer,
      path.zValues.buffer,
      path.lineDurationsSeconds.buffer,
      path.zeroDurationLines.buffer,
    ])
    self.postMessage({
      type: 'complete',
      requestId: request.requestId,
      lineCount: availableLineCount,
      fileName: request.file.name,
      fileSize: request.file.size,
    })
  } catch (error) {
    if (request.requestId === activeRequestId) {
      self.postMessage({
        type: 'error',
        requestId: request.requestId,
        message:
          error instanceof Error ? error.message : 'Unable to read this file.',
      })
    }
  }
}

async function readLines(request: ReadMessage): Promise<void> {
  const file = activeFile
  const index = activeIndex
  if (!file || !index || request.requestId !== activeRequestId) return
  if (
    request.startLine < 0 ||
    request.endLine <= request.startLine ||
    request.startLine >= availableLineCount
  ) {
    return
  }

  try {
    const endLine = Math.min(request.endLine, availableLineCount)
    const [start, end] = index.getRange(request.startLine, endLine)
    const text = await file.slice(start, end).text()
    if (request.requestId !== activeRequestId) return

    const lines = text.split('\n')
    if (endLine < availableLineCount && lines.length > 1) lines.pop()
    const rows = lines.map((line, offset) => {
      const source = line.endsWith('\r') ? line.slice(0, -1) : line
      return {
        index: request.startLine + offset,
        source,
        explanation: explainGcodeLine(source),
      }
    })

    self.postMessage({
      type: 'lines',
      requestId: request.requestId,
      startLine: request.startLine,
      lineCount: availableLineCount,
      rows,
    })
  } catch (error) {
    if (request.requestId === activeRequestId) {
      self.postMessage({
        type: 'error',
        requestId: request.requestId,
        message:
          error instanceof Error
            ? error.message
            : 'Unable to read these lines.',
      })
    }
  }
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data
  if (request.type === 'load') {
    activeRequestId = request.requestId
    activeFile = undefined
    activeIndex = undefined
    availableLineCount = 0
    void indexFile(request)
  } else if (request.requestId === activeRequestId) {
    void readLines(request)
  }
}
