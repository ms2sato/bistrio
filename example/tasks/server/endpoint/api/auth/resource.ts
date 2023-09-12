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
  user: (option?: opt<CustomMethodOption>): User => {
    return option?.body.user || { username: 'unknown', id: 0, role: -1, createdAt: new Date(), updatedAt: new Date() }
  },
  logout: () => {
    throw new Error('override by adapter')
  },
}))
