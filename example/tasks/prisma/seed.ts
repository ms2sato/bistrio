import { PrismaClient } from '@prisma/client'

console.log('[BEGIN SEED]')
const env = process.env.NODE_ENV || 'development'

console.log('NODE_ENV', env)
if (env === 'production') {
  throw new Error('[CAUTION!]cannot seed on NODE_ENV=production')
}

async function main() {
  const seed = await import(`./seeds/${env}`).then((m) => m.default)

  const prisma = new PrismaClient()
  try {
    await seed(prisma)
  } finally {
    prisma.$disconnect().catch((e) => {
      console.error(e)
    })
  }
}

main()
  .then(() => {
    console.log('[END SEED SUCCESS]')
  })
  .catch((e) => {
    console.error(e)
    console.log('[END SEED ERROR]')
    process.exit(1)
  })
