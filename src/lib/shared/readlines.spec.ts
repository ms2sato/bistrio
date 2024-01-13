import { readLines } from './readlines.js'

const newReadableStream = () => {
  let callCount = 0

  return new ReadableStream({
    start(controller) {
      // 最初のデータを提供します。
      controller.enqueue(new TextEncoder().encode('line1\nline2\nline3\nli'))
      callCount++
    },
    pull(controller) {
      // リーダーが新しいデータを要求するたびに、次のデータを提供します。
      if (callCount === 1) {
        controller.enqueue(new TextEncoder().encode('ne4\nline5'))
        controller.close()
      }
    },
  })
}

describe('readLines', () => {
  describe('bufferSize = 1', () => {
    it('reads lines correctly', async () => {
      const mockFile = { stream: () => newReadableStream() } as unknown as File
      const callback = jest.fn().mockResolvedValue('processed')

      const result = await readLines(mockFile, callback)

      expect(callback).toHaveBeenCalledTimes(5)
      expect(callback).toHaveBeenNthCalledWith(1, ['line1'])
      expect(callback).toHaveBeenNthCalledWith(2, ['line2'])
      expect(callback).toHaveBeenNthCalledWith(3, ['line3'])
      expect(callback).toHaveBeenNthCalledWith(4, ['line4'])
      expect(callback).toHaveBeenNthCalledWith(5, ['line5'])

      expect(result).toEqual({ lines: 5, results: ['processed', 'processed', 'processed', 'processed', 'processed'] })
    })
  })

  describe('multi bufferSize', () => {
    it('reads lines correctly', async () => {
      const mockFile = { stream: () => newReadableStream() } as unknown as File
      const callback = jest.fn().mockResolvedValue('processed')

      const result = await readLines(mockFile, callback, 2)

      expect(callback).toHaveBeenCalledTimes(3)
      expect(callback).toHaveBeenNthCalledWith(1, ['line1', 'line2'])
      expect(callback).toHaveBeenNthCalledWith(2, ['line3', 'line4'])
      expect(callback).toHaveBeenNthCalledWith(3, ['line5'])

      expect(result).toEqual({ lines: 5, results: ['processed', 'processed', 'processed'] })
    })
  })
})
