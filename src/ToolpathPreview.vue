<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  findPreviousExtrusionLayer,
  getZAtLine,
  type MotionPathData,
} from './gcode-motion'

const props = defineProps<{
  path: MotionPathData | null
  selectedLine: number | null
  isLoading: boolean
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const selectedSegment = computed(() => {
  const { path, selectedLine } = props
  if (!path || selectedLine === null) return -1

  let low = 0
  let high = path.lineIndices.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (path.lineIndices[middle] < selectedLine) low = middle + 1
    else high = middle
  }
  return path.lineIndices[low] === selectedLine ? low : -1
})

const selectionDescription = computed(() => {
  if (props.selectedLine === null) return 'Select a line to preview its path.'
  if (props.isLoading || !props.path) return `Line ${props.selectedLine + 1}`
  if (selectedSegment.value === -1)
    return `Line ${props.selectedLine + 1} · No XY movement`
  return `Line ${props.selectedLine + 1} · ${
    props.path?.extruding[selectedSegment.value] ? 'Extruding' : 'Travel'
  } move`
})

let resizeObserver: ResizeObserver | undefined

function drawPath(): void {
  const element = canvas.value
  if (!element) return

  const width = element.clientWidth
  const height = element.clientHeight
  if (!width || !height) return

  const ratio = window.devicePixelRatio || 1
  element.width = Math.round(width * ratio)
  element.height = Math.round(height * ratio)
  const context = element.getContext('2d')
  if (!context) return

  context.scale(ratio, ratio)
  context.clearRect(0, 0, width, height)
  const path = props.path
  if (!path || props.selectedLine === null) return

  let segmentCount = 0
  let low = 0
  let high = path.lineIndices.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (path.lineIndices[middle] <= props.selectedLine) low = middle + 1
    else high = middle
  }
  segmentCount = low
  if (segmentCount === 0) return

  const currentZ = getZAtLine(path, props.selectedLine)
  const isCurrentLayer = (segment: number) =>
    Math.abs(path.zPositions[segment] - currentZ) < 1e-6
  const previousZ = findPreviousExtrusionLayer(
    path,
    currentZ,
    props.selectedLine,
  )
  const isPreviousLayer = (segment: number) =>
    previousZ !== undefined &&
    Math.abs(path.zPositions[segment] - previousZ) < 1e-6

  const padding = 22
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  const hasExtrusion = path.extruding.some(Boolean)
  for (let segment = 0; segment < path.lineIndices.length; segment += 1) {
    if (hasExtrusion && !path.extruding[segment]) continue

    const offset = segment * 4
    minX = Math.min(
      minX,
      path.coordinates[offset],
      path.coordinates[offset + 2],
    )
    minY = Math.min(
      minY,
      path.coordinates[offset + 1],
      path.coordinates[offset + 3],
    )
    maxX = Math.max(
      maxX,
      path.coordinates[offset],
      path.coordinates[offset + 2],
    )
    maxY = Math.max(
      maxY,
      path.coordinates[offset + 1],
      path.coordinates[offset + 3],
    )
  }
  if (!Number.isFinite(minX)) return

  const rangeX = Math.max(maxX - minX, 1)
  const rangeY = Math.max(maxY - minY, 1)
  const scale = Math.min(
    (width - padding * 2) / rangeX,
    (height - padding * 2) / rangeY,
  )
  const drawnWidth = rangeX * scale
  const drawnHeight = rangeY * scale
  const offsetX = (width - drawnWidth) / 2
  const offsetY = (height - drawnHeight) / 2
  const projectX = (x: number) => offsetX + (x - minX) * scale
  const projectY = (y: number) => height - offsetY - (y - minY) * scale

  const drawPreviousLayer = () => {
    if (previousZ === undefined) return

    context.beginPath()
    for (let segment = 0; segment < segmentCount; segment += 1) {
      if (!isPreviousLayer(segment) || !path.extruding[segment]) continue

      const offset = segment * 4
      context.moveTo(
        projectX(path.coordinates[offset]),
        projectY(path.coordinates[offset + 1]),
      )
      context.lineTo(
        projectX(path.coordinates[offset + 2]),
        projectY(path.coordinates[offset + 3]),
      )
    }
    context.strokeStyle = '#e1e5e8'
    context.lineWidth = 1
    context.setLineDash([])
    context.stroke()
  }

  const drawSegments = (extruding: boolean) => {
    context.beginPath()
    for (let segment = 0; segment < segmentCount; segment += 1) {
      if (
        path.lineIndices[segment] === props.selectedLine ||
        Boolean(path.extruding[segment]) !== extruding ||
        !isCurrentLayer(segment)
      ) {
        continue
      }
      const offset = segment * 4
      context.moveTo(
        projectX(path.coordinates[offset]),
        projectY(path.coordinates[offset + 1]),
      )
      context.lineTo(
        projectX(path.coordinates[offset + 2]),
        projectY(path.coordinates[offset + 3]),
      )
    }
    context.strokeStyle = extruding ? '#315c78' : '#b4c1ca'
    context.lineWidth = extruding ? 2 : 1
    context.setLineDash(extruding ? [] : [3, 3])
    context.stroke()
  }

  drawPreviousLayer()
  drawSegments(false)
  drawSegments(true)

  if (selectedSegment.value !== -1) {
    const offset = selectedSegment.value * 4
    context.beginPath()
    context.moveTo(
      projectX(path.coordinates[offset]),
      projectY(path.coordinates[offset + 1]),
    )
    context.lineTo(
      projectX(path.coordinates[offset + 2]),
      projectY(path.coordinates[offset + 3]),
    )
    context.strokeStyle = '#d45a36'
    context.lineWidth = 3
    context.setLineDash([])
    context.stroke()
  }
}

watch(() => [props.path, props.selectedLine], drawPath, { flush: 'post' })

onMounted(() => {
  if (!canvas.value) return
  resizeObserver = new ResizeObserver(drawPath)
  resizeObserver.observe(canvas.value)
  drawPath()
})

onBeforeUnmount(() => resizeObserver?.disconnect())
</script>

<template>
  <aside class="toolpath-panel" aria-label="Toolpath visualization">
    <div class="toolpath-heading">
      <span class="toolpath-selection">{{ selectionDescription }}</span>
    </div>
    <div class="toolpath-canvas-wrap">
      <canvas
        ref="canvas"
        role="img"
        :aria-label="`Top-down XY toolpath. ${selectionDescription}`"
      >
        Top-down XY toolpath preview
      </canvas>
    </div>
    <div class="toolpath-legend" aria-label="Path legend">
      <span><i class="legend-extrusion"></i> Extrusion</span>
      <span><i class="legend-travel"></i> Travel</span>
      <span><i class="legend-previous-layer"></i> Previous Layer</span>
      <span><i class="legend-current"></i> Current move</span>
    </div>
  </aside>
</template>
