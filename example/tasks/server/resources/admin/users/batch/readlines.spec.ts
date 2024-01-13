import { readLines } from './readlines'

describe('readLines', () => {
  describe('bufferSize = 1', () => {
    it('reads lines correctly', async () => {
      const mockStream = {
        pipeThrough: jest.fn().mockReturnThis(),
        getReader: jest.fn().mockReturnValue({
          read: jest
            .fn()
            .mockResolvedValueOnce({ value: 'line1\nline2\nline3\nli', done: false })
            .mockResolvedValueOnce({ value: 'ne4\nline5', done: true }),
        }),
      }
      const mockFile = { stream: jest.fn().mockReturnValue(mockStream) } as unknown as File

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
      const mockStream = {
        pipeThrough: jest.fn().mockReturnThis(),
        getReader: jest.fn().mockReturnValue({
          read: jest
            .fn()
            .mockResolvedValueOnce({ value: 'line1\nline2\nline3\nli', done: false })
            .mockResolvedValueOnce({ value: 'ne4\nline5', done: true }),
        }),
      }
      const mockFile = { stream: jest.fn().mockReturnValue(mockStream) } as unknown as File

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
