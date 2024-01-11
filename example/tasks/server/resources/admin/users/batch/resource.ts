import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

import { UploadedFile, defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { CustomMethodOption } from '@/server/customizers'
import { AdminUserBatchResource } from '@/.bistrio/resources'
import { object, string } from 'zod'
import { hash } from '@/server/lib/crypter'

const prisma = getPrismaCilent()

type ReadLineResult<R> = {
  lines: number
  results: R[]
}

type ReadLineCallback<R> = (line: string[]) => Promise<R>

const readLines = async <R>(filePath: string, callback: ReadLineCallback<R>): Promise<ReadLineResult<R>> => {
  const stream = createReadStream(filePath)
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity,
  })

  let lines = 0
  const results: R[] = []
  for await (const line of rl) {
    const bucket = [line] // TODO: can optimize create bucket
    results.push(await callback(bucket))
    lines++
  }
  return Promise.resolve({ lines, results })
}

const lineSchema = object({
  username: string(),
  password: string(),
})

export type BatchResult = { count: number; error?: Error[] }

export default defineResource(
  (_support, _options) =>
    ({
      create: async ({ file: anyFile }): Promise<BatchResult> => {
        const file = anyFile as UploadedFile // TODO: fix type

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

        const result = await readLines(file.tempFilePath, callback)

        return {
          count: result.results.reduce((acc, cur) => acc + cur.count, 0),
          error: result.results
            .filter((r) => r.error)
            .map((r) => (r.error instanceof Error ? r.error : new Error(JSON.stringify(r.error)))),
        }
      },
    }) as const satisfies AdminUserBatchResource<CustomMethodOption>,
)
