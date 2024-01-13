import { LineTextStream } from './line-text-stream'

test('1line', async () => {
  const textStream = new ReadableStream({
    start(controller) {
      controller.enqueue('line1')
      controller.close()
    },
  })
  const stream = textStream.pipeThrough(new LineTextStream(1))
  const reader = stream.getReader()

  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line1'])
  }

  {
    const { value, done } = await reader.read()
    expect(done).toBe(true)
    expect(value).toEqual(undefined)
  }
})

test('multi line', async () => {
  const textStream = new ReadableStream({
    start(controller) {
      controller.enqueue('line1\nline2\nline3\nli')
      controller.enqueue('ne4\nline5')
      controller.close()
    },
  })
  const stream = textStream.pipeThrough(new LineTextStream(1))
  const reader = stream.getReader()

  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line1'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line2'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line3'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line4'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line5'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(true)
    expect(value).toEqual(undefined)
  }
})

test('buffered line', async () => {
  const textStream = new ReadableStream({
    start(controller) {
      controller.enqueue('line1\nline2\nline3\nli')
      controller.enqueue('ne4\nline5')
      controller.close()
    },
  })
  const stream = textStream.pipeThrough(new LineTextStream(2))
  const reader = stream.getReader()

  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line1', 'line2'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line3', 'line4'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(false)
    expect(value).toEqual(['line5'])
  }
  {
    const { value, done } = await reader.read()
    expect(done).toBe(true)
    expect(value).toEqual(undefined)
  }
})