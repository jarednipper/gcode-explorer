export class StreamingLines {
  private readonly decoder = new TextDecoder()
  private pending = ''
  private emittedLines = 0
  private endedWithNewline = false

  push(chunk: Uint8Array): string[] {
    const decoded = this.decoder.decode(chunk, { stream: true })
    return this.consume(decoded)
  }

  finish(): string[] {
    const decoded = this.decoder.decode()
    const lines = this.consume(decoded)
    if (this.pending.length > 0) {
      lines.push(this.cleanLine(this.pending))
      this.emittedLines += 1
      this.pending = ''
    } else if (this.emittedLines === 0 || this.endedWithNewline) {
      lines.push('')
      this.emittedLines += 1
    }
    return lines
  }

  private consume(decoded: string): string[] {
    if (decoded.length === 0) return []

    const parts = (this.pending + decoded).split('\n')
    this.pending = parts.pop() ?? ''
    this.endedWithNewline = decoded.endsWith('\n')
    const lines = parts.map((line) => this.cleanLine(line))
    this.emittedLines += lines.length
    return lines
  }

  private cleanLine(line: string): string {
    return line.endsWith('\r') ? line.slice(0, -1) : line
  }
}
