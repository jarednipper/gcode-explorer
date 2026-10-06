export class ByteLineIndex {
  private starts = new Float64Array(1024)
  private length = 1
  private byteLength = 0

  constructor() {
    this.starts[0] = 0
  }

  append(chunk: Uint8Array): void {
    for (let index = 0; index < chunk.length; index += 1) {
      if (chunk[index] === 10) {
        this.push(this.byteLength + index + 1)
      }
    }
    this.byteLength += chunk.length
  }

  get lineCount(): number {
    return this.length
  }

  get fileSize(): number {
    return this.byteLength
  }

  getLineStart(line: number): number {
    if (!Number.isInteger(line) || line < 0 || line >= this.length) {
      throw new RangeError(`Line index ${line} is out of range.`)
    }
    return this.starts[line]
  }

  getRange(startLine: number, endLine: number): [number, number] {
    if (
      !Number.isInteger(startLine) ||
      !Number.isInteger(endLine) ||
      startLine < 0 ||
      endLine < startLine ||
      endLine > this.length
    ) {
      throw new RangeError(
        `Line range ${startLine}-${endLine} is out of range.`,
      )
    }

    return [
      this.starts[startLine],
      endLine < this.length ? this.starts[endLine] : this.byteLength,
    ]
  }

  private push(offset: number): void {
    if (this.length === this.starts.length) {
      const expanded = new Float64Array(this.starts.length * 2)
      expanded.set(this.starts)
      this.starts = expanded
    }
    this.starts[this.length] = offset
    this.length += 1
  }
}
