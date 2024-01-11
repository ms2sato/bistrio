import { readLines } from './readlines'

describe('readLines', () => {
  it('reads lines correctly', async () => {
    // Mock the File class and its stream method
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

    // Define the callback function
    const callback = jest.fn().mockResolvedValue('processed')

    // Call the function
    const result = await readLines(mockFile, callback)

    // Check that the callback was called with each line
    expect(callback).toHaveBeenCalledTimes(5)
    expect(callback).toHaveBeenNthCalledWith(1, ['line1'])
    expect(callback).toHaveBeenNthCalledWith(2, ['line2'])
    expect(callback).toHaveBeenNthCalledWith(3, ['line3'])
    expect(callback).toHaveBeenNthCalledWith(4, ['line4'])
    expect(callback).toHaveBeenNthCalledWith(5, ['line5'])

    // Check the result
    expect(result).toEqual({ lines: 5, results: ['processed', 'processed', 'processed', 'processed', 'processed'] })
  })
})
