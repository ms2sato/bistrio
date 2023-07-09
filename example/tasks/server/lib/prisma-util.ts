import createDebug from 'debug'
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
