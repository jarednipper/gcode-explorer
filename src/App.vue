<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  watchEffect,
} from 'vue'
import {
  ExternalLink,
  LayersArrowDown,
  LayersArrowUp,
  Pause,
  Play,
} from '@lucide/vue'
import ToolpathPreview from './ToolpathPreview.vue'
import { isGcodeFile } from './gcode'
import { getZAtLine, type MotionPathData } from './gcode-motion'
import { getVirtualWindow } from './virtual-window'

const rowHeight = 38
const visibleRowWindow = 100
const batchSize = 64
const maxCachedBatches = 8
const appBaseUrl = import.meta.env.BASE_URL

interface GcodeRow {
  index: number
  source: string
  explanation: string
}

type WorkerResponse =
  | {
      type: 'progress'
      requestId: number
      loadedBytes: number
      totalBytes: number
      availableLineCount: number
    }
  | {
      type: 'complete'
      requestId: number
      lineCount: number
      fileName: string
      fileSize: number
    }
  | {
      type: 'lines'
      requestId: number
      startLine: number
      lineCount: number
      rows: GcodeRow[]
    }
  | ({ type: 'path'; requestId: number } & MotionPathData)
  | { type: 'error'; requestId: number; message: string; startLine?: number }

const lineCount = ref(0)
const rowsByLine = shallowRef(new Map<number, GcodeRow>())
const pathData = shallowRef<MotionPathData | null>(null)
const selectedLine = ref<number | null>(null)
const fileName = ref('')
const errorMessage = ref('')
const isDragging = ref(false)
const isLoading = ref(false)
const loadProgress = ref(0)
const lineInput = ref('')
const zLayerInput = ref('')
const playbackSpeed = ref(10)
const isPlaying = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const comparisonShell = ref<HTMLDivElement | null>(null)
const scrollContainer = ref<HTMLDivElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(640)
let playbackTimer: number | undefined
let worker: Worker | undefined
let resizeObserver: ResizeObserver | undefined
let activeRequestId = 0
const pendingBatches = new Set<number>()

const virtualWindow = computed(() =>
  getVirtualWindow(
    lineCount.value,
    scrollTop.value,
    viewportHeight.value,
    rowHeight,
    visibleRowWindow,
  ),
)
const virtualRows = computed(() =>
  Array.from(
    { length: virtualWindow.value.end - virtualWindow.value.start },
    (_, offset) => {
      const index = virtualWindow.value.start + offset
      return { index, start: index * rowHeight, size: rowHeight }
    },
  ),
)
const currentZ = computed(() =>
  pathData.value && selectedLine.value !== null
    ? getZAtLine(pathData.value, selectedLine.value)
    : null,
)
const extrusionLayers = computed(() => {
  const path = pathData.value
  if (!path) return []

  const layers: { z: number; line: number }[] = []
  const seenZ = new Set<number>()
  for (let segment = 0; segment < path.lineIndices.length; segment += 1) {
    if (!path.extruding[segment]) continue

    const z = path.zPositions[segment]
    if (seenZ.has(z)) continue
    seenZ.add(z)
    layers.push({ z, line: path.lineIndices[segment] })
  }
  return layers
})
const previousLayerLine = computed(() => {
  const selected = selectedLine.value
  if (selected === null) return undefined

  let previousLine: number | undefined
  for (const layer of extrusionLayers.value) {
    if (layer.line >= selected) break
    previousLine = layer.line
  }
  return previousLine
})
const nextLayerLine = computed(() => {
  const selected = selectedLine.value
  if (selected === null) return undefined
  return extrusionLayers.value.find(
    (layer) => layer.line > selected,
  )?.line
})

watch(
  [selectedLine, lineCount],
  ([line]) => {
    lineInput.value = line === null ? '' : String(line + 1)
  },
  { immediate: true },
)
watch(currentZ, (z) => {
  zLayerInput.value = z === null ? '' : String(Number(z.toFixed(3)))
})
watch(playbackSpeed, () => {
  if (isPlaying.value) startPlaybackTimer()
})

watch(
  scrollContainer,
  (element) => {
    resizeObserver?.disconnect()
    if (!element) return

    updateViewport()
    resizeObserver = new ResizeObserver(() => updateViewport())
    resizeObserver.observe(element)
  },
  { flush: 'post' },
)

function updateViewport(event?: Event): void {
  const element =
    event?.currentTarget instanceof HTMLElement
      ? event.currentTarget
      : scrollContainer.value
  if (!element) return

  scrollTop.value = element.scrollTop
  viewportHeight.value = element.clientHeight
}

function handleComparisonWheel(event: WheelEvent): void {
  const shell = comparisonShell.value
  if (!shell) return

  const horizontalGesture = Math.abs(event.deltaX) > Math.abs(event.deltaY)
  const horizontalDelta = event.shiftKey ? event.deltaY : event.deltaX
  if (!horizontalDelta || (!event.shiftKey && !horizontalGesture)) return

  const maxScrollLeft = shell.scrollWidth - shell.clientWidth
  const nextScrollLeft = Math.max(
    0,
    Math.min(maxScrollLeft, shell.scrollLeft + horizontalDelta),
  )
  if (nextScrollLeft === shell.scrollLeft) return

  event.preventDefault()
  shell.scrollLeft = nextScrollLeft
}

function clearRows(): void {
  rowsByLine.value = new Map()
  pendingBatches.clear()
}

function cacheBatch(startLine: number, batchRows: GcodeRow[]): void {
  const rows = new Map(rowsByLine.value)
  for (const row of batchRows) rows.set(row.index, row)
  for (const row of batchRows) rows.delete(row.index)
  for (const row of batchRows) rows.set(row.index, row)

  while (
    new Set(
      [...rows.keys()].map((line) => Math.floor(line / batchSize) * batchSize),
    ).size > maxCachedBatches
  ) {
    const firstLine = rows.keys().next().value
    if (firstLine === undefined) break
    const oldestStart = Math.floor(firstLine / batchSize) * batchSize
    for (const line of rows.keys()) {
      if (Math.floor(line / batchSize) * batchSize === oldestStart)
        rows.delete(line)
    }
  }
  rowsByLine.value = rows
  pendingBatches.delete(startLine)
}

function handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
  const message = event.data
  if (message.requestId !== activeRequestId) return

  if (message.type === 'progress') {
    loadProgress.value =
      message.totalBytes === 0
        ? 100
        : Math.floor((message.loadedBytes / message.totalBytes) * 100)
    lineCount.value = Math.max(lineCount.value, message.availableLineCount)
    return
  }

  if (message.type === 'complete') {
    isLoading.value = false
    loadProgress.value = 100
    lineCount.value = message.lineCount
    selectedLine.value = message.lineCount > 0 ? 0 : null
    return
  }

  if (message.type === 'lines') {
    cacheBatch(message.startLine, message.rows)
    lineCount.value = Math.max(lineCount.value, message.lineCount)
    return
  }

  if (message.type === 'path') {
    pathData.value = {
      coordinates: message.coordinates,
      lineIndices: message.lineIndices,
      extruding: message.extruding,
      zPositions: message.zPositions,
      zLineIndices: message.zLineIndices,
      zValues: message.zValues,
    }
    return
  }

  isLoading.value = false
  pendingBatches.clear()
  errorMessage.value = `Could not process ${fileName.value}: ${message.message}`
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./gcode.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = handleWorkerMessage
    worker.onerror = (event) => {
      isLoading.value = false
      errorMessage.value = `The file worker stopped unexpectedly: ${event.message}`
    }
  }
  return worker
}

watchEffect(() => {
  const items = virtualRows.value
  if (lineCount.value === 0 || items.length === 0) return

  const firstBlock = Math.floor(items[0].index / batchSize)
  const lastBlock = Math.floor(items[items.length - 1].index / batchSize)
  for (let block = firstBlock; block <= lastBlock; block += 1) {
    const startLine = block * batchSize
    const endLine = Math.min(startLine + batchSize, lineCount.value)
    if (
      pendingBatches.has(startLine) ||
      Array.from({ length: endLine - startLine }, (_, offset) =>
        rowsByLine.value.has(startLine + offset),
      ).every(Boolean)
    ) {
      continue
    }

    pendingBatches.add(startLine)
    worker?.postMessage({
      type: 'read',
      requestId: activeRequestId,
      startLine,
      endLine,
    })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  stopPlayback()
  worker?.terminate()
})

function openFilePicker(): void {
  fileInput.value?.click()
}

function loadFile(file: File | undefined): void {
  if (!file) return

  errorMessage.value = ''
  if (!isGcodeFile(file.name)) {
    errorMessage.value = 'Choose a GCODE file (.gcode, .gco, .gc, or .g).'
    return
  }

  if (scrollContainer.value) scrollContainer.value.scrollTop = 0
  stopPlayback()
  scrollTop.value = 0
  activeRequestId += 1
  lineCount.value = 0
  pathData.value = null
  selectedLine.value = null
  fileName.value = file.name
  isLoading.value = true
  loadProgress.value = 0
  clearRows()
  getWorker().postMessage({ type: 'load', requestId: activeRequestId, file })
}

async function loadBenchyExample(): Promise<void> {
  errorMessage.value = ''

  try {
    const response = await fetch(`${import.meta.env.BASE_URL}benchy.gcode`)
    if (!response.ok) {
      throw new Error(`The example could not be fetched (${response.status}).`)
    }

    const file = new File([await response.blob()], 'benchy.gcode', {
      type: 'text/plain',
    })
    loadFile(file)
  } catch (error) {
    errorMessage.value = `Could not load the Benchy example: ${
      error instanceof Error ? error.message : 'Unknown error.'
    }`
  }
}

function selectLine(line: number): void {
  selectedLine.value = line
}

function selectAndRevealLine(line: number): void {
  if (lineCount.value === 0) return

  const nextLine = Math.max(0, Math.min(lineCount.value - 1, line))
  selectedLine.value = nextLine
  const container = scrollContainer.value
  if (!container) return

  const lineTop = nextLine * rowHeight
  const lineBottom = lineTop + rowHeight
  if (lineTop < container.scrollTop) {
    container.scrollTop = lineTop
  } else if (lineBottom > container.scrollTop + container.clientHeight) {
    container.scrollTop = lineBottom - container.clientHeight
  }
  updateViewport()
}

function jumpToLine(): void {
  const line = Number.parseInt(lineInput.value, 10)
  if (!Number.isFinite(line)) return
  selectAndRevealLine(line - 1)
}

function jumpToZLayer(): void {
  const targetZ = Number(zLayerInput.value)
  const path = pathData.value
  if (!path || !Number.isFinite(targetZ)) return

  let closestZ: number | undefined
  for (let segment = 0; segment < path.lineIndices.length; segment += 1) {
    if (!path.extruding[segment]) continue

    const z = path.zPositions[segment]
    if (
      closestZ === undefined ||
      Math.abs(z - targetZ) < Math.abs(closestZ - targetZ)
    ) {
      closestZ = z
    }
  }
  if (closestZ === undefined) return

  for (let segment = 0; segment < path.lineIndices.length; segment += 1) {
    if (
      path.extruding[segment] &&
      Math.abs(path.zPositions[segment] - closestZ) < 1e-6
    ) {
      selectAndRevealLine(path.lineIndices[segment])
      return
    }
  }
}

function skipLayer(direction: 'previous' | 'next'): void {
  const targetLine =
    direction === 'previous' ? previousLayerLine.value : nextLayerLine.value
  if (targetLine !== undefined) selectAndRevealLine(targetLine)
}

function stopPlayback(): void {
  isPlaying.value = false
  if (playbackTimer !== undefined) {
    window.clearInterval(playbackTimer)
    playbackTimer = undefined
  }
}

function startPlaybackTimer(): void {
  if (playbackTimer !== undefined) window.clearInterval(playbackTimer)

  playbackTimer = window.setInterval(() => {
    const nextLine = (selectedLine.value ?? -1) + 1
    if (nextLine >= lineCount.value) {
      stopPlayback()
      return
    }
    selectAndRevealLine(nextLine)
  }, 1000 / playbackSpeed.value)
}

function togglePlayback(): void {
  if (isPlaying.value) {
    stopPlayback()
    return
  }
  if (lineCount.value === 0) return

  if (selectedLine.value === null) selectAndRevealLine(0)
  isPlaying.value = true
  startPlaybackTimer()
}

async function handleGridKeydown(event: KeyboardEvent): Promise<void> {
  if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return

  event.preventDefault()
  if (lineCount.value === 0) return

  const target = event.target
  const focusedRow =
    target instanceof HTMLElement
      ? target.closest<HTMLElement>('[data-line-index]')
      : null
  const focusedLine = focusedRow?.dataset.lineIndex
  const currentLine =
    focusedLine === undefined ? selectedLine.value : Number(focusedLine)
  const baseLine = currentLine ?? (event.key === 'ArrowUp' ? 1 : -1)
  const direction = event.key === 'ArrowDown' ? 1 : -1
  const nextLine = Math.max(
    0,
    Math.min(lineCount.value - 1, baseLine + direction),
  )

  selectedLine.value = nextLine
  const container = scrollContainer.value
  if (!container) return

  const lineTop = nextLine * rowHeight
  const lineBottom = lineTop + rowHeight
  if (lineTop < container.scrollTop) {
    container.scrollTop = lineTop
  } else if (lineBottom > container.scrollTop + container.clientHeight) {
    container.scrollTop = lineBottom - container.clientHeight
  }
  updateViewport()

  await nextTick()
  const row = Array.from(
    container.querySelectorAll<HTMLElement>('[data-line-index]'),
  ).find((element) => Number(element.dataset.lineIndex) === nextLine)
  row?.focus()
}

function handleFileChange(event: Event): void {
  const input = event.currentTarget
  if (!(input instanceof HTMLInputElement)) return

  loadFile(input.files?.[0])
  input.value = ''
}

function handleDrop(event: DragEvent): void {
  isDragging.value = false
  const files = event.dataTransfer?.files
  if (!files?.length) return

  if (files.length > 1) {
    errorMessage.value = 'Drop one GCODE file at a time.'
    return
  }

  loadFile(files[0])
}

function handleDragLeave(event: DragEvent): void {
  const currentTarget = event.currentTarget
  const relatedTarget = event.relatedTarget
  if (
    currentTarget instanceof Node &&
    relatedTarget instanceof Node &&
    currentTarget.contains(relatedTarget)
  ) {
    return
  }

  isDragging.value = false
}
</script>

<template>
  <div
    class="app-shell"
    :class="{ 'is-dragging': isDragging }"
    @dragenter.prevent="isDragging = true"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleDrop"
  >
    <header class="topbar">
      <a class="brand" :href="appBaseUrl" aria-label="GCODE Explorer home"
        >GCODE Explorer</a
      >
      <div class="file-actions">
        <span v-if="fileName" class="file-name" :title="fileName">{{
          fileName
        }}</span>
        <a
          class="repository-link"
          href="https://github.com/jarednipper/gcode-explorer"
          target="_blank"
        >
          GitHub repo
          <ExternalLink :size="12" aria-hidden="true" />
        </a>
        <label class="visually-hidden" for="gcode-file"
          >Choose a GCODE file</label
        >
        <input
          id="gcode-file"
          ref="fileInput"
          class="visually-hidden"
          type="file"
          accept=".gcode,.gco,.gc,.g"
          @change="handleFileChange"
        />
      </div>
    </header>

    <main class="workspace">
      <div v-if="errorMessage" class="error-message" role="alert">
        {{ errorMessage }}
      </div>

      <section
        v-if="lineCount === 0"
        class="empty-state"
        aria-labelledby="empty-heading"
      >
        <div class="empty-content">
          <template v-if="isLoading">
            <p class="eyebrow">Preparing large file</p>
            <h1 id="empty-heading">{{ fileName }}</h1>
            <p>
              Building a line index in the background. You can keep using this
              page.
            </p>
            <progress
              :value="loadProgress"
              max="100"
              aria-label="File processing progress"
            >
              {{ loadProgress }}%
            </progress>
            <small>{{ loadProgress }}% indexed</small>
          </template>
          <template v-else>
            <p>Visualize and explore GCODE commands.</p>
            <div class="example-actions">
              <button type="button" @click="openFilePicker">
                Open a GCODE file
              </button>
              <button
                class="example-link"
                type="button"
                @click="loadBenchyExample"
              >
                or try a Benchy example
              </button>
            </div>
            <small>Supports .gcode, .gco, .gc, and .g files</small>
          </template>
        </div>
      </section>

      <section v-else class="explorer" aria-label="GCODE and line explanations">
        <div class="explorer-content">
          <div class="table-panel">
            <div
              ref="comparisonShell"
              class="comparison-shell"
              @wheel="handleComparisonWheel"
            >
              <div class="comparison-grid">
                <div class="comparison-head" role="row">
                  <span class="column-heading line-heading" role="columnheader"
                    >Line</span
                  >
                  <span class="column-heading" role="columnheader">GCODE</span>
                  <span class="column-heading" role="columnheader"
                    >Explanation</span
                  >
                </div>

                <div
                  ref="scrollContainer"
                  class="comparison-scroll"
                  role="grid"
                  aria-label="Synchronized GCODE lines and explanations"
                  tabindex="0"
                  @scroll="updateViewport"
                  @keydown="handleGridKeydown"
                >
                  <div
                    class="virtual-spacer"
                    :style="{ height: `${virtualWindow.totalSize}px` }"
                  >
                    <div
                      v-for="virtualRow in virtualRows"
                      :key="virtualRow.index"
                      class="comparison-row"
                      :class="{
                        'is-selected': selectedLine === virtualRow.index,
                      }"
                      role="row"
                      :aria-selected="selectedLine === virtualRow.index"
                      :data-line-index="virtualRow.index"
                      tabindex="0"
                      :style="{
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }"
                      @click="selectLine(virtualRow.index)"
                      @keydown.enter.prevent="selectLine(virtualRow.index)"
                      @keydown.space.prevent="selectLine(virtualRow.index)"
                    >
                      <span class="line-number" role="cell">{{
                        virtualRow.index + 1
                      }}</span>
                      <code
                        class="source-code"
                        role="cell"
                        :title="rowsByLine.get(virtualRow.index)?.source"
                      >
                        {{
                          rowsByLine.get(virtualRow.index)?.source ??
                          'Loading line…'
                        }}
                      </code>
                      <span
                        class="explanation"
                        role="cell"
                        :title="rowsByLine.get(virtualRow.index)?.explanation"
                      >
                        {{
                          rowsByLine.get(virtualRow.index)?.explanation ??
                          'Loading explanation…'
                        }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="control-pane" aria-label="GCODE playback controls">
              <label class="control-field">
                <span>Line</span>
                <input
                  v-model="lineInput"
                  type="number"
                  min="1"
                  :max="lineCount"
                  step="1"
                  aria-label="Line number"
                  @change="jumpToLine"
                  @keyup.enter.prevent="jumpToLine"
                />
              </label>
              <div class="z-layer-control">
                <label class="control-field">
                  <span>Z height</span>
                  <input
                    v-model="zLayerInput"
                    type="number"
                    step="any"
                    aria-label="Z height"
                    :disabled="!pathData"
                    @change="jumpToZLayer"
                    @keyup.enter.prevent="jumpToZLayer"
                  />
                </label>
                <div class="layer-navigation" aria-label="Layer navigation">
                  <button
                    class="layer-button"
                    type="button"
                    aria-label="Previous layer"
                    title="Previous layer"
                    :disabled="previousLayerLine === undefined"
                    @click="skipLayer('previous')"
                  >
                    <LayersArrowDown aria-hidden="true" />
                  </button>
                  <button
                    class="layer-button"
                    type="button"
                    aria-label="Next layer"
                    title="Next layer"
                    :disabled="nextLayerLine === undefined"
                    @click="skipLayer('next')"
                  >
                    <LayersArrowUp aria-hidden="true" />
                  </button>
                </div>
              </div>
              <button
                class="playback-button auto-play-toggle"
                type="button"
                :disabled="lineCount === 0"
                :aria-pressed="isPlaying"
                :aria-label="
                  isPlaying
                    ? 'Turn off auto-play GCODE progression'
                    : 'Turn on auto-play GCODE progression'
                "
                :title="
                  isPlaying
                    ? 'Turn off auto-play GCODE progression'
                    : 'Turn on auto-play GCODE progression'
                "
                @click="togglePlayback"
              >
                <Pause v-if="isPlaying" aria-hidden="true" />
                <Play v-else aria-hidden="true" />
                <span>{{ isPlaying ? 'Pause' : 'Auto-play' }}</span>
              </button>
              <label v-if="isPlaying" class="speed-control">
                <span>Speed</span>
                <select
                  v-model.number="playbackSpeed"
                  aria-label="Playback speed"
                >
                  <option :value="1">1 command/s</option>
                  <option :value="5">5 commands/s</option>
                  <option :value="10">10 commands/s</option>
                  <option :value="20">20 commands/s</option>
                  <option :value="40">40 commands/s</option>
                  <option :value="80">80 commands/s</option>
                </select>
              </label>
            </div>
          </div>
          <ToolpathPreview
            :path="pathData"
            :selected-line="selectedLine"
            :is-loading="isLoading"
          />
        </div>
      </section>
    </main>

    <div v-if="isDragging" class="drop-overlay" aria-hidden="true">
      <div>Drop one GCODE file to open it</div>
    </div>
  </div>
</template>
