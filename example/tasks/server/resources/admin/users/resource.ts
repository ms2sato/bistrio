import { defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { User } from '@prisma/client'
import { AdminUsersResource } from '@bistrio/resources'
import { CustomMethodOption } from '@/server/customizers'

const prisma = getPrismaCilent()

type SecureUser = Omit<User, 'hashedPassword'>

export default defineResource(
  () =>
    ({
      async list({ q: _q }): Promise<SecureUser[]> {
        const users = await prisma.user.findMany()
        return users.map((user) => ({ ...user, hashedPassword: undefined })) // TODO: to secure
      },
    }) as const satisfies AdminUsersResource<CustomMethodOption>,
)
