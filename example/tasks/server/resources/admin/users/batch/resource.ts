import { defineResource, ReadLineCallback, readLines } from 'bistrio'
import { getPrismaClient } from '@server/lib/prisma-util'
import { CustomActionOptions } from '@/server/customizers'
import { AdminUserBatchResource } from '@/.bistrio/resources'
import { object, string } from 'zod'
import { hash } from '@/server/lib/crypter'

const prisma = getPrismaClient()

const lineSchema = object({
  username: string(),
  password: string(),
})

export type BatchResult = { count: number; error?: Error[] }

export default defineResource(
  () =>
    ({
      create: async ({ file }): Promise<BatchResult> => {
        const callback: ReadLineCallback<{ count: number; error?: unknown }> = async (lines) => {
          const data = []
          for (const line of lines) {
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

        const result = await readLines(file, callback)

        return {
          count: result.results.reduce((acc, cur) => acc + cur.count, 0),
          error: result.results
            .filter((r) => r.error)
            .map((r) => (r.error instanceof Error ? r.error : new Error(JSON.stringify(r.error)))),
        }
      },
    }) as const satisfies AdminUserBatchResource<CustomActionOptions>,
)
