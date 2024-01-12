import { OpenMode, createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { Readable } from 'node:stream'
import { Abortable } from 'node:events'
import { UploadedFile } from 'bistrio'

export class LocalFile extends File {
  mv

  constructor(private uf: UploadedFile) {
    super([], uf.name, { type: uf.mimetype })

    this.mv = this.uf.mv.bind(this.uf)
  }

  stream(): ReadableStream<Uint8Array> {
    return Readable.toWeb(createReadStream(this.uf.tempFilePath)) as ReadableStream<Uint8Array>
  }

  get size(): number {
    return this.uf.size
  }

  get type(): string {
    return this.uf.mimetype
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
    return await readFile(this.uf.tempFilePath, options)
  }

  async text(
    options:
      | ({
          encoding: BufferEncoding
          flag?: OpenMode | undefined
        } & Abortable)
      | BufferEncoding = { encoding: 'utf8' },
  ): Promise<string> {
    return readFile(this.uf.tempFilePath, options)
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
    return new Blob([buffer], { type: this.uf.mimetype })
  }

  slice(_start?: number, _end?: number, _contentType?: string): Blob {
    throw new Error("Unimplemented 'slice' method")
  }
}
