import { PrismaClient } from '@prisma/client'

const env = process.env.NODE_ENV || 'development'

async function main(prisma: PrismaClient) {
  console.log('NODE_ENV', env)
  if (env === 'production') {
    throw new Error('[CAUTION!]truncate cannot on NODE_ENV=production')
  }

  const tasks = [
    {
      title: 'Test1',
      description: 'Test1 Description',
      done: false,
    },
    {
      title: 'Test2',
      description: 'Test2 Description',
      done: false,
    },
  ]

  for (let i = 0; i < tasks.length; ++i) {
    const task = tasks[i]
    const param = {
      where: { id: i + 1 },
      update: task,
      create: task,
    }
    console.log(await prisma.task.upsert(param))
  }
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
