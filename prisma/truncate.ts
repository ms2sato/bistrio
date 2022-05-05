import { PrismaClient } from '@prisma/client'

async function main(prisma: PrismaClient) {
  console.log('NODE_ENV', process.env.NODE_ENV)
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('[CAUTION!]truncate can on NODE_ENV=development')
  }

  const ret = await prisma.$queryRaw<
    [{ tablename: string }]
  >`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' AND tablename!='_prisma_migrations'`

  const modelNames = ret.map((row) => row.tablename)
  console.log(`${modelNames.join(',')} will truncate`)

  await prisma.$queryRaw`SET CONSTRAINTS ALL DEFERRED`

  for (const modelName of modelNames) {
    const query = `TRUNCATE "public"."${modelName}" RESTART IDENTITY`
    console.log(query)
    await prisma.$queryRawUnsafe(query)
  }

  await prisma.$queryRaw`SET CONSTRAINTS ALL IMMEDIATE`
}

const prisma = new PrismaClient()

main(prisma)
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect().catch((e) => {
      console.error(e)
    })
  })
