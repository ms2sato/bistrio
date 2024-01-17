import { OpenMode, Stats, createReadStream, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { Abortable } from 'node:events'

export class LocalFile extends File {
  readonly stat: Stats

  constructor(
    readonly filePath: string,
    type = 'application/octet-stream',
    name = 'tmpfile',
  ) {
    super([], name, { type })
    this.stat = statSync(filePath)
  }

  get size() {
    return this.stat.size
  }

  get lastModified() {
    return this.stat.mtimeMs
  }

  stream(): ReadableStream<Uint8Array> {
    return Readable.toWeb(createReadStream(this.filePath)) as ReadableStream<Uint8Array>
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const buffer = await this.buffer()
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }

  async buffer(
    options?:
      | ({
          encoding?: null | undefined
          flag?: OpenMode | undefined
        } & Abortable)
      | null,
  ): Promise<Buffer> {
    return await readFile(this.filePath, options)
  }

  async text(): Promise<string> {
    return readFile(this.filePath, { encoding: 'utf8' })
  }

  async blob(
    options?:
      | ({
          encoding?: null | undefined
          flag?: OpenMode | undefined
        } & Abortable)
      | null,
  ): Promise<Blob> {
    const buffer = await this.buffer(options)
    return new Blob([buffer], { type: this.type })
  }

  slice(_start?: number, _end?: number, _contentType?: string): Blob {
    throw new Error("Unimplemented 'slice' method")
  }
}
