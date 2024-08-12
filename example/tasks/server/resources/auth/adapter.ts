import { authenticate } from '@/server/lib/passport-util'
import { defineAdapter, AdapterOf, HttpResponseError } from 'bistrio'
import { userSchema } from '@/universal/params'
import type resource from './resource'

type Adapter = AdapterOf<typeof resource>

export default defineAdapter<Adapter>(() => ({
  verify: {
    override: async (ctx) => {
      const { user, info } = await authenticate(ctx)

      if (!user) {
        throw new HttpResponseError(info?.message || 'Unauthorized', 401)
      }

      return userSchema.parse(user)
    },
  },

  logout: {
    override: async (ctx) => {
      await new Promise<void>((resolve, reject) => {
        ctx.req.logout((err) => {
          if (err) {
            reject(err instanceof Error ? err : new Error(String(err)))
          } else {
            resolve()
          }
        })
      })
      return { ok: true }
    },
  },
}))
