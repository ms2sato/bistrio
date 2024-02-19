import { defineResource } from 'bistrio'
import { CustomMethodOption } from '@/server/customizers'
import { User } from '@/universal/params'
import { AuthResource } from '@/.bistrio/resources'

export default defineResource(
  () =>
    ({
      verify: (_params): Promise<User> => {
        throw new Error('override by adapter')
      },
      user: (option): User | null => {
        return option.user || null
      },
      logout: () => {
        throw new Error('override by adapter')
      },
    }) as const satisfies AuthResource<CustomMethodOption>,
)
