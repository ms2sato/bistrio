import { LineTextStream } from './line-text-stream.js'

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
  const textStream = file.stream().pipeThrough(new TextDecoderStream()).pipeThrough(new LineTextStream(bufferSize))
  const reader = textStream.getReader()

  const results: R[] = []
  let chunk: string[] | undefined
  let readerDone: boolean
  let lineCount = 0
  do {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    ;({ value: chunk, done: readerDone } = await reader.read())
    if (chunk?.length) {
      lineCount += chunk.length
      results.push(await callback(chunk))
    }
  } while (!readerDone)

  return { lines: lineCount, results }
}
