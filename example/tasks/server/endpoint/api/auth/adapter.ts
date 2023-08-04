import { authenticate } from '@/server/lib/passport-util'
import { defineAdapter, AdapterOf, HttpResponseError } from 'bistrio'
import { userSchema } from '@/isomorphic/params'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource>

export default defineAdapter<Adapter>(() => ({
  user: {},

  create: (_ctx) => {
    throw new Error('unimplemented')
  },

  verify: {
    override: async (ctx) => {
      const { user, info } = await authenticate(ctx)

      if (!user) {
        throw new HttpResponseError(info?.message || 'Unauthorized', 401)
      }

      return userSchema.parse(user)
    },
  },
}))
