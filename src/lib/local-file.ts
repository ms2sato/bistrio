import { OpenMode, createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { Abortable } from 'node:events'

export class LocalFile extends File {
  constructor(
    readonly filePath: string,
    readonly size: number,
    type: string = 'application/octet-stream',
    name: string = 'tmpfile',
  ) {
    super([], name, { type })
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
