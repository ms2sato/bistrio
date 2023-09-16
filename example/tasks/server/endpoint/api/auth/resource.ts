import { defineResource, opt } from 'bistrio'
import { CustomMethodOption } from '@/server/customizers'
import { User } from '@/isomorphic/params'
import { SessionCreateParams } from '@/isomorphic/params'

export default defineResource((_support, _options) => ({
  create: (_params: SessionCreateParams): Promise<User> => {
    throw new Error('override by adapter')
  },
  verify: (_params: SessionCreateParams): Promise<User> => {
    throw new Error('override by adapter')
  },
  user: (option?: opt<CustomMethodOption>): User | null => {
    return option?.body.user || null
  },
  logout: () => {
    throw new Error('override by adapter')
  },
}))
