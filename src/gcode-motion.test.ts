import { describe, expect, it } from 'vitest'
import {
  findPreviousExtrusionLayer,
  getZAtLine,
  GcodeMotionIndex,
} from './gcode-motion'

function buildPath(lines: string[]) {
  const index = new GcodeMotionIndex()
  lines.forEach((line, lineNumber) => index.addLine(line, lineNumber))
  return index.toPathData()
}

describe('GcodeMotionIndex', () => {
  it('records absolute XY moves and classifies extrusion', () => {
    const path = buildPath([
      'G1 X10 Y20',
      'M82',
      'G1 X20 Y20 E1',
      'G1 X30 Y20 E0.5',
    ])

    expect([...path.lineIndices]).toEqual([0, 2, 3])
    expect([...path.coordinates]).toEqual([
      0, 0, 10, 20, 10, 20, 20, 20, 20, 20, 30, 20,
    ])
    expect([...path.extruding]).toEqual([0, 1, 0])
  })

  describe('findPreviousExtrusionLayer', () => {
    it('skips Z-hop heights and finds the previous printed layer', () => {
      const previousZ = findPreviousExtrusionLayer(
        {
          lineIndices: new Uint32Array([10, 11, 12, 13, 14]),
          extruding: new Uint8Array([1, 0, 0, 1, 1]),
          zPositions: new Float64Array([0.2, 0.6, 0.2, 0.36, 0.76]),
        },
        0.36,
        13,
      )

      expect(previousZ).toBeCloseTo(0.2)
    })
  })

  it('tracks relative positioning and coordinate resets', () => {
    const path = buildPath([
      'G91',
      'G1 X2 Y-3',
      'G1 X1',
      'G92 X0 Y0',
      'G1 X4 Y5',
    ])

    expect([...path.lineIndices]).toEqual([1, 2, 4])
    expect([...path.coordinates]).toEqual([
      0, 0, 2, -3, 2, -3, 3, -3, 0, 0, 4, 5,
    ])
  })

  it('tracks inch units, extrusion modes, and homing resets', () => {
    const path = buildPath([
      'G20',
      'G1 X1 Y2 E1',
      'M83',
      'G1 X1 Y0 E0.25',
      'G28 X0',
      'G21',
      'G1 X5',
    ])

    expect([...path.lineIndices]).toEqual([1, 3, 6])
    expect([...path.coordinates]).toEqual([
      0, 0, 25.4, 50.8, 25.4, 50.8, 25.4, 0, 0, 0, 5, 0,
    ])
    expect([...path.extruding]).toEqual([1, 1, 0])
  })

  it('estimates move durations from modal feedrates and current units', () => {
    const path = buildPath([
      'G1 X10 F600',
      'G1 X20',
      'G20',
      'G92 X0',
      'G1 X1 F60',
      'G21',
      'M83',
      'G1 E2 F120',
      'G0 X10',
      'M104 S210',
    ])

    expect([...path.lineDurationsSeconds]).toHaveLength(10)
    expect(path.lineDurationsSeconds[0]).toBeCloseTo(1)
    expect(path.lineDurationsSeconds[1]).toBeCloseTo(1)
    expect(path.lineDurationsSeconds[4]).toBeCloseTo(1)
    expect(path.lineDurationsSeconds[7]).toBeCloseTo(1)
    expect(path.lineDurationsSeconds[8]).toBe(0)
    expect(path.lineDurationsSeconds[9]).toBe(0)
  })

  it('marks blank and comment-only lines as zero-duration lines', () => {
    const path = buildPath([
      '; comment',
      '  ',
      'G1 X10 F600',
      'G1 X20 ; inline',
    ])

    expect([...path.zeroDurationLines]).toEqual([1, 1, 0, 0])
    expect(path.lineDurationsSeconds[0]).toBe(0)
    expect(path.lineDurationsSeconds[1]).toBe(0)
  })

  it('tracks the active Z position on XY moves and standalone Z changes', () => {
    const path = buildPath([
      'G1 X1 Y1 Z0.2 E1',
      'G1 X2 Y1 E2',
      'G1 Z0.4',
      'G1 X3 Y1 E3',
      'G91',
      'G1 Z0.2',
      'G1 X4 Y1 E1',
    ])

    expect([...path.lineIndices]).toEqual([0, 1, 3, 6])
    path.zPositions.forEach((z, index) =>
      expect(z).toBeCloseTo([0.2, 0.2, 0.4, 0.6][index]),
    )
    expect([...path.zLineIndices]).toEqual([0, 2, 5])
    path.zValues.forEach((z, index) =>
      expect(z).toBeCloseTo([0.2, 0.4, 0.6][index]),
    )
    expect(getZAtLine(path, 1)).toBeCloseTo(0.2)
    expect(getZAtLine(path, 3)).toBeCloseTo(0.4)
    expect(getZAtLine(path, 6)).toBeCloseTo(0.6)
  })

  it('tolerates line numbers and canonicalizes zero-padded motion commands', () => {
    const path = buildPath([
      'N10 G00 X0 Y0',
      'N11 G01 X2 Y3 E1',
      'N12 G1 X4 Y3 E0.5',
    ])

    expect([...path.lineIndices]).toEqual([1, 2])
    expect([...path.coordinates]).toEqual([0, 0, 2, 3, 2, 3, 4, 3])
    expect([...path.extruding]).toEqual([1, 0])
  })

  it('ignores non-linear commands, comments, and XY no-op moves', () => {
    const path = buildPath([
      '; G1 X50 Y50',
      'G2 X10 Y10 I5 J0',
      'G1 X0 Y0',
      'G1 X0 Y0 E1',
      'M104 S210',
    ])

    expect([...path.lineIndices]).toEqual([])
    expect([...path.coordinates]).toEqual([])
  })
})
