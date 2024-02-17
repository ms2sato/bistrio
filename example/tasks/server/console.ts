// for REPL
import { initConfig, support } from 'bistrio'
import { routes } from '../universal/routes/all'
import { config } from '../config'
import { serverRouterConfig } from './config'
import { Middlewares } from '../universal/middlewares'
import { getPrismaClient } from '@server/lib/prisma-util'

initConfig(config)

const prisma = getPrismaClient()

support
  .loadResources<Middlewares>(
    serverRouterConfig(),
    routes,
    { prisma }, // 3rd argument is the extension object for customize global object
  )
  .catch((err: Error) => {
    console.error(`console error: ${err.message}`)
  })
