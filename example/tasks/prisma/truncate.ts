import { PrismaClient } from '@prisma/client'

const env = process.env.NODE_ENV || 'development'

async function main(prisma: PrismaClient) {
  console.log('NODE_ENV', env)
  if (env === 'production') {
    throw new Error('[CAUTION!]truncate cannot on NODE_ENV=production')
  }

  const ret = await prisma.$queryRaw<
    [{ tablename: string }]
  >`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename!='_prisma_migrations'`

  const modelNames = ret.map((row) => row.tablename)
  console.log(`${modelNames.join(',')} will truncate`)

  await prisma.$queryRaw`SET CONSTRAINTS ALL DEFERRED`

  for (const modelName of modelNames) {
    const query = `TRUNCATE "public"."${modelName}" RESTART IDENTITY CASCADE`
    console.log(query)
    await prisma.$queryRawUnsafe(query)
  }

  await prisma.$queryRaw`SET CONSTRAINTS ALL IMMEDIATE`
}

console.log('[BEGIN TRUNCATE]')
const prisma = new PrismaClient()
main(prisma)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect().then(()=> {
      console.log('[END TRUNCATE]')
    }).catch((e) => {
      console.error(e)
    })
  })
