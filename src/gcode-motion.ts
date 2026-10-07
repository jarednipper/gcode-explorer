export interface MotionPathData {
  coordinates: Float64Array
  lineIndices: Uint32Array
  extruding: Uint8Array
  zPositions: Float64Array
  zLineIndices: Uint32Array
  zValues: Float64Array
  lineDurationsSeconds: Float32Array
  zeroDurationLines: Uint8Array
}

export function getZAtLine(
  path: Pick<MotionPathData, 'zLineIndices' | 'zValues'>,
  line: number,
): number {
  let low = 0
  let high = path.zLineIndices.length
  while (low < high) {
    const middle = Math.floor((low + high) / 2)
    if (path.zLineIndices[middle] <= line) low = middle + 1
    else high = middle
  }
  return low === 0 ? 0 : path.zValues[low - 1]
}

export function findPreviousExtrusionLayer(
  path: Pick<MotionPathData, 'lineIndices' | 'extruding' | 'zPositions'>,
  currentZ: number,
  selectedLine: number,
): number | undefined {
  let previousZ: number | undefined
  for (let segment = 0; segment < path.lineIndices.length; segment += 1) {
    if (
      path.lineIndices[segment] > selectedLine ||
      !path.extruding[segment] ||
      path.zPositions[segment] >= currentZ - 1e-6
    ) {
      continue
    }

    if (previousZ === undefined || path.zPositions[segment] > previousZ) {
      previousZ = path.zPositions[segment]
    }
  }
  return previousZ
}

export class GcodeMotionIndex {
  private coordinates = new Float64Array(4096)
  private lineIndices = new Uint32Array(1024)
  private extruding = new Uint8Array(1024)
  private zPositions = new Float64Array(1024)
  private zLineIndices = new Uint32Array(128)
  private zValues = new Float64Array(128)
  private lineDurationsSeconds = new Float32Array(1024)
  private zeroDurationLines = new Uint8Array(1024)
  private lineCount = 0
  private segmentCount = 0
  private zChangeCount = 0
  private x = 0
  private y = 0
  private z = 0
  private e = 0
  private feedRate = 0
  private absolutePositioning = true
  private absoluteExtrusion = true
  private unitScale = 1

  addLine(line: string, lineIndex: number): void {
    this.lineCount = Math.max(this.lineCount, lineIndex + 1)
    this.ensureLineDurationCapacity(lineIndex + 1)
    const commandText = line.split(';', 1)[0].trim()
    if (!commandText) {
      this.zeroDurationLines[lineIndex] = 1
    }
    const command = commandText.match(
      /^(?:N\d+\s+)?([GMT])(\d+(?:\.\d+)?)(.*)$/i,
    )
    if (!command) return

    const code = this.normalizeCommandCode(command[1], command[2])
    const parameters = command[3]

    if (code === 'G90' || code === 'G91') {
      this.absolutePositioning = code === 'G90'
      return
    }
    if (code === 'M82' || code === 'M83') {
      this.absoluteExtrusion = code === 'M82'
      return
    }
    if (code === 'G20' || code === 'G21') {
      this.unitScale = code === 'G20' ? 25.4 : 1
      return
    }
    if (code === 'G28') {
      const axes = new Set(
        [
          ...parameters.matchAll(/([XYZ])(?:[+-]?(?:\d+(?:\.\d*)?|\.\d+))?/gi),
        ].map((match) => match[1].toUpperCase()),
      )
      if (axes.size === 0 || axes.has('X')) this.x = 0
      if (axes.size === 0 || axes.has('Y')) this.y = 0
      if (axes.size === 0 || axes.has('Z')) this.setZ(0, lineIndex)
      return
    }

    const values = new Map<string, number>()
    for (const match of parameters.matchAll(
      /([XYZE])([+-]?(?:\d+(?:\.\d*)?|\.\d+))/gi,
    )) {
      values.set(match[1].toUpperCase(), Number(match[2]))
    }

    if (code === 'G92') {
      const x = values.get('X')
      const y = values.get('Y')
      const z = values.get('Z')
      const e = values.get('E')
      if (x !== undefined) this.x = x * this.unitScale
      if (y !== undefined) this.y = y * this.unitScale
      if (z !== undefined) this.setZ(z * this.unitScale, lineIndex)
      if (e !== undefined) this.e = e * this.unitScale
      return
    }

    if (code !== 'G0' && code !== 'G1') return

    const feedRateValue = parameters.match(/F([+-]?(?:\d+(?:\.\d*)?|\.\d+))/i)
    if (feedRateValue) {
      this.feedRate = Number(feedRateValue[1]) * this.unitScale
    }

    const xValue = values.get('X')
    const yValue = values.get('Y')
    const zValue = values.get('Z')
    const eValue = values.get('E')
    const fromX = this.x
    const fromY = this.y
    const fromZ = this.z
    const toZ =
      zValue === undefined
        ? this.z
        : this.absolutePositioning
          ? zValue * this.unitScale
          : this.z + zValue * this.unitScale
    const toX =
      xValue === undefined
        ? this.x
        : this.absolutePositioning
          ? xValue * this.unitScale
          : this.x + xValue * this.unitScale
    const toY =
      yValue === undefined
        ? this.y
        : this.absolutePositioning
          ? yValue * this.unitScale
          : this.y + yValue * this.unitScale

    let extrusionDelta = 0
    if (eValue !== undefined) {
      const nextE = eValue * this.unitScale
      extrusionDelta = this.absoluteExtrusion ? nextE - this.e : nextE
      this.e = this.absoluteExtrusion ? nextE : this.e + nextE
    }

    this.x = toX
    this.y = toY
    this.setZ(toZ, lineIndex)
    const xyzDistance = Math.hypot(toX - fromX, toY - fromY, toZ - fromZ)
    const distance = xyzDistance > 0 ? xyzDistance : Math.abs(extrusionDelta)
    if (
      distance > 0 &&
      this.feedRate > 0 &&
      (code !== 'G0' || feedRateValue !== null)
    ) {
      this.ensureLineDurationCapacity(lineIndex + 1)
      this.lineDurationsSeconds[lineIndex] = (distance / this.feedRate) * 60
    }
    if (fromX === toX && fromY === toY) return

    this.ensureCapacity()
    const coordinateOffset = this.segmentCount * 4
    this.coordinates.set([fromX, fromY, toX, toY], coordinateOffset)
    this.lineIndices[this.segmentCount] = lineIndex
    this.extruding[this.segmentCount] = extrusionDelta > 1e-9 ? 1 : 0
    this.zPositions[this.segmentCount] = toZ
    this.segmentCount += 1
  }

  toPathData(): MotionPathData {
    return {
      coordinates: this.coordinates.slice(0, this.segmentCount * 4),
      lineIndices: this.lineIndices.slice(0, this.segmentCount),
      extruding: this.extruding.slice(0, this.segmentCount),
      zPositions: this.zPositions.slice(0, this.segmentCount),
      zLineIndices: this.zLineIndices.slice(0, this.zChangeCount),
      zValues: this.zValues.slice(0, this.zChangeCount),
      lineDurationsSeconds: this.lineDurationsSeconds.slice(0, this.lineCount),
      zeroDurationLines: this.zeroDurationLines.slice(0, this.lineCount),
    }
  }

  private ensureLineDurationCapacity(requiredLength: number): void {
    if (requiredLength <= this.lineDurationsSeconds.length) return

    let capacity = this.lineDurationsSeconds.length
    while (capacity < requiredLength) capacity *= 2
    const next = new Float32Array(capacity)
    next.set(this.lineDurationsSeconds)
    this.lineDurationsSeconds = next
    const nextZeroDurationLines = new Uint8Array(capacity)
    nextZeroDurationLines.set(this.zeroDurationLines)
    this.zeroDurationLines = nextZeroDurationLines
  }

  private setZ(z: number, lineIndex: number): void {
    if (z === this.z) return

    this.z = z
    if (this.zChangeCount === this.zLineIndices.length) {
      this.zLineIndices = this.growUint32Array(this.zLineIndices)
      this.zValues = this.growFloat64Array(this.zValues)
    }

    this.zLineIndices[this.zChangeCount] = lineIndex
    this.zValues[this.zChangeCount] = z
    this.zChangeCount += 1
  }

  private ensureCapacity(): void {
    if (this.segmentCount < this.lineIndices.length) return

    this.lineIndices = this.growUint32Array(this.lineIndices)
    this.extruding = this.growUint8Array(this.extruding)
    this.zPositions = this.growFloat64Array(this.zPositions)
    this.coordinates = this.growFloat64Array(this.coordinates)
  }

  private normalizeCommandCode(prefix: string, value: string): string {
    const code = value
      .replace(/^0+(?=\d)/, '')
      .replace(/(\.\d*?[1-9])0+$/, '$1')
      .replace(/\.0+$/, '')

    return `${prefix.toUpperCase()}${code}`
  }

  private growUint32Array(values: Uint32Array): Uint32Array {
    const next = new Uint32Array(values.length * 2)
    next.set(values)
    return next
  }

  private growUint8Array(values: Uint8Array): Uint8Array {
    const next = new Uint8Array(values.length * 2)
    next.set(values)
    return next
  }

  private growFloat64Array(values: Float64Array): Float64Array {
    const next = new Float64Array(values.length * 2)
    next.set(values)
    return next
  }
}
