import { createReadStream } from 'node:fs'
import { readFile } from 'node:fs/promises'

import { UploadedFile, defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { CustomMethodOption } from '@/server/customizers'
import { AdminUserBatchResource } from '@/.bistrio/resources'
import { object, string } from 'zod'
import { hash } from '@/server/lib/crypter'
import { Readable } from 'node:stream'
import { ReadLineCallback, readLines } from './readlines'

const prisma = getPrismaCilent()

const lineSchema = object({
  username: string(),
  password: string(),
})

export type BatchResult = { count: number; error?: Error[] }

class LocalFile extends File {
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
    const buffer = await readFile(this.uf.tempFilePath)
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  }

  async text(): Promise<string> {
    return readFile(this.uf.tempFilePath, { encoding: 'utf8' })
  }

  async blob(): Promise<Blob> {
    const buffer = await readFile(this.uf.tempFilePath)
    return new Blob([buffer], { type: this.uf.mimetype })
  }

  slice(_start?: number, _end?: number, _contentType?: string): Blob {
    throw new Error("Unimplemented 'slice' method")
  }
}

export default defineResource(
  (_support, _options) =>
    ({
      create: async ({ file: anyFile }): Promise<BatchResult> => {
        const file = anyFile as UploadedFile // TODO: fix type

        // const readable:ReadableStream = Readable.toWeb(createReadStream(file.tempFilePath))
        // const f:File = new File(readable, file.name, { type: file.mimetype })

        const callback: ReadLineCallback<{ count: number; error?: unknown }> = async (lines) => {
          const data = []
          for (const line of lines) {
            console.log(`Line from file: ${line}`)
            const { username, password } = lineSchema.parse(JSON.parse(line))
            const hashedPassword = await hash(password)
            data.push({ username, hashedPassword })
          }

          try {
            const users = await prisma.user.createMany({ data })
            return { count: users.count }
          } catch (error) {
            return { count: 0, error }
          }
        }

        const result = await readLines(new LocalFile(file), callback)

        return {
          count: result.results.reduce((acc, cur) => acc + cur.count, 0),
          error: result.results
            .filter((r) => r.error)
            .map((r) => (r.error instanceof Error ? r.error : new Error(JSON.stringify(r.error)))),
        }
      },
    }) as const satisfies AdminUserBatchResource<CustomMethodOption>,
)
