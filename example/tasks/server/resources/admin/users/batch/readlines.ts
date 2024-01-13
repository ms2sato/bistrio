export type ReadLineResult<R> = {
  lines: number
  results: R[]
}

export type ReadLineCallback<R> = (line: string[]) => Promise<R>

export const readLines = async <R>(
  file: File,
  callback: ReadLineCallback<R>,
  bufferSize = 1,
): Promise<ReadLineResult<R>> => {
  const readableStream = file.stream()
  const textStream = readableStream.pipeThrough(new TextDecoderStream())
  const reader = textStream.getReader()

  const results: R[] = []
  const lines: string[] = []
  let incompleteLine: string = ''
  let chunk
  let readerDone
  let lineCount = 0

  do {
    ;({ value: chunk, done: readerDone } = await reader.read())
    chunk = chunk ? chunk : ''

    chunk = incompleteLine + chunk
    const chunkLines = chunk.split('\n')
    const newLineIncomplete = !chunk.endsWith('\n')

    if (newLineIncomplete) {
      incompleteLine = chunkLines.pop() || ''
    } else {
      incompleteLine = ''
    }

    lines.push(...chunkLines)
    lineCount += chunkLines.length

    while (lines.length >= bufferSize) {
      const buffer = lines.splice(0, bufferSize)
      results.push(await callback(buffer))
    }
  } while (!readerDone)

  if (incompleteLine) {
    lineCount++
    lines.push(incompleteLine)
  }

  while (lines.length > 0) {
    const buffer = lines.splice(0, bufferSize)
    results.push(await callback(buffer))
  }

  return Promise.resolve({ lines: lineCount, results })
}
