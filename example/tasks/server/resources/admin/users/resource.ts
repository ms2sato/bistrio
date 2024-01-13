import { defineResource } from 'bistrio'
import { getPrismaCilent } from '@server/lib/prisma-util'
import { User } from '@prisma/client'
import { AdminUsersResource } from '@bistrio/resources'
import { CustomMethodOption } from '@/server/customizers'

const prisma = getPrismaCilent()

export default defineResource(
  (_support, _options) =>
    ({
      list({ q: _q }): Promise<User[]> {
        return prisma.user.findMany()
      },
    }) as const satisfies AdminUsersResource<CustomMethodOption>,
)
