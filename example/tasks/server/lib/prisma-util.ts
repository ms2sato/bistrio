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

type PrismaAnyClient<T> = {
  findMany: (args?: unknown) => Promise<T[]>
  findUnique: (args: unknown) => Promise<T>
  create: (args: unknown) => Promise<T>
  update: (args: unknown) => Promise<T>
  delete: (args: unknown) => Promise<boolean>
}

export const createPrismaEasyDataAccessor = <
  T,
  IP extends PrimaryKeyParams<IT, IN>,
  CP,
  UP,
  IN extends string = 'id',
  IT = number
>(
  unknownPrismaClient: unknown,
  keyName: IN
) => {
  const client = unknownPrismaClient as PrismaAnyClient<T> // FIXME: unsafe
  return {
    list: async (args?: unknown): Promise<T[]> => {
      return await client.findMany(args)
    },

    get: async (params: IP): Promise<T> => {
      return await client.findUnique({ where: { [keyName]: params[keyName] }, rejectOnNotFound: true })
    },

    create: async (params: CP): Promise<T> => {
      return await client.create({
        data: { ...params, done: false },
      })
    },

    update: async (params: UP & IP) => {
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
