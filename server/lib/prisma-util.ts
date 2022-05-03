/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import createDebug from 'debug'
import { PrimaryKeyParams } from 'restrant2'
import { PrismaClient } from '@prisma/client'

const log = createDebug('bistrio:sql')

let _prisma: PrismaClient

export const getPrismaCilent = (): PrismaClient => {
  if (!_prisma) {
    const prisma = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'query',
        },
      ],
    })

    prisma.$on('query', ({ query, params }) => {
      log('%s %s', query, params)
    })

    _prisma = prisma
  }

  return _prisma
}

export const createPrismaEasyDataAccessor = <
  T,
  IP extends PrimaryKeyParams<IT, IN>,
  CP,
  UP extends IP,
  IN extends string = 'id',
  IT = number
>(
  client: any,
  keyName: IN
) => {
  return {
    list: async (arg?: any): Promise<T[]> => {
      return await client.findMany(arg)
    },

    get: async (params: IP): Promise<T> => {
      return await client.findUnique({ where: { [keyName]: params[keyName] }, rejectOnNotFound: true })
    },

    create: async (params: CP): Promise<T> => {
      return await client.create({
        data: { ...params, done: false },
      })
    },

    update: async (params: UP) => {
      const data = { ...params }
      const key = data[keyName]
      delete data[keyName]
      return await client.update({
        where: { [keyName]: key },
        data,
      })
    },

    destroy: async (params: IP) => {
      await client.delete({
        where: { [keyName]: params[keyName] },
      })
    },
  }
}
