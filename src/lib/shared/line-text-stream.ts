export class LineTextStream extends TransformStream<string, string[]> {
  constructor(bufferSize = 100) {
    let incompleteLine: string = ''
    const lines: string[] = []

    super({
      transform(chunk, controller) {
        chunk = incompleteLine + chunk
        const chunkLines = chunk.split('\n')
        const newLineIncomplete = !chunk.endsWith('\n')

        if (newLineIncomplete) {
          incompleteLine = chunkLines.pop() || ''
        } else {
          incompleteLine = ''
        }

        lines.push(...chunkLines)

        while (lines.length >= bufferSize) {
          const buffer = lines.splice(0, bufferSize)
          controller.enqueue(buffer)
        }
      },

      flush(controller) {
        if (incompleteLine) {
          lines.push(incompleteLine)
        }

        while (lines.length > 0) {
          const buffer = lines.splice(0, bufferSize)
          controller.enqueue(buffer)
        }
      },
    })
  }
}
