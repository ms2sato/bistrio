export type ReadLineResult<R> = {
  lines: number
  results: R[]
}

export type ReadLineCallback<R> = (line: string[]) => Promise<R>

export const readLines = async <R>(file: File, callback: ReadLineCallback<R>): Promise<ReadLineResult<R>> => {
  const readableStream = file.stream()

  // ReadableStream をテキストに変換
  const textStream = readableStream.pipeThrough(new TextDecoderStream())

  // ラインリーダーを作成
  const reader = textStream.getReader()

  const results: R[] = []

  // ラインバッファ
  const lines: string[] = []
  let incompleteLine: string = ''
  let chunk
  let readerDone
  let lineCount = 0

  // ストリームを読み込み、行ごとに処理
  do {
    // 次のチャンクを読み込む
    ;({ value: chunk, done: readerDone } = await reader.read())
    chunk = chunk ? chunk : ''

    chunk = incompleteLine + chunk
    const chunkLines = chunk.split('\n')
    const newLineIncomplete = !chunk.endsWith('\n')

    if (newLineIncomplete) {
      incompleteLine = chunkLines.pop() || '' // 最後の行は完全ではない可能性がある
    } else {
      incompleteLine = ''
    }

    lines.push(...chunkLines)
    lineCount += chunkLines.length

    for (const l of lines) {
      // ここで各行に対する処理を行う
      //console.log(l);
      results.push(await callback([l]))
    }

    lines.length = 0
  } while (!readerDone)

  // 最後の行を処理（もし完了していない場合）
  if (incompleteLine) {
    lineCount++
    //console.log(line);
    results.push(await callback([incompleteLine]))
  }

  return Promise.resolve({ lines: lineCount, results })
}
