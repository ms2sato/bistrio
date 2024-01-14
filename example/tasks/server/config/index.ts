import { resolve, join } from 'node:path'
import { OpenMode, createReadStream, createWriteStream, statSync } from 'node:fs'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import {
  ContentArranger,
  ServerRouterConfig,
  createSmartInputArranger,
  defaultContentType2Arranger,
  initServerRouterConfig,
} from 'bistrio'
import { loadPage, importLocal } from '../../config/server/imports'
import { createActionOptions } from '../customizers/index'
import { Readable } from 'node:stream'
import { Abortable } from 'node:events'

// config for Routers in server
export function serverRouterConfig(): ServerRouterConfig {
  return initServerRouterConfig({
    baseDir: resolve('./server'),
    createActionOptions,
    loadPage,
    importLocal,
    inputArranger: createSmartInputArranger({
      'application/octet-stream': arrangeOctetStreamInput,
      ...defaultContentType2Arranger,
    }),
  })
}

export class TmpFile extends File {
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
const arrangeOctetStreamInput: ContentArranger = async (ctx, sources, schema): Promise<File> => {
  const dir = await mkdtemp(join(tmpdir(), 'uploaded-'))
  const type = ctx.req.headers['content-type'] || 'application/octet-stream'
  const filename = 'tmpfile'

  const tmpFilePath = join(dir, filename)
  ctx.req.pipe(createWriteStream(tmpFilePath)) // TODO: remove tmp file on error and request end

  const promise = new Promise<File>((resolve, reject) => {
    ctx.req.on('end', () => {
      const stats = statSync(tmpFilePath)
      resolve(new TmpFile(tmpFilePath, stats.size, type, filename))
    })
    ctx.req.on('error', (err) => reject(err))
  })
  return await promise
}
