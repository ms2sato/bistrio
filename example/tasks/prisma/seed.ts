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
      comments: {
        create: [
          {
            body: 'TestComment1',
          },
          {
            body: 'TestComment2',
          },
        ],
      },
      tags: {
        create: [
          {
            tag: {
              connectOrCreate: {
                where: { label: 'tag1' },
                create: { label: 'tag1' },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { label: 'tag2' },
                create: { label: 'tag2' },
              },
            },
          }
        ]
      }
    },
    {
      title: 'Test2',
      description: 'Test2 Description',
      done: false,
      tags: {
        create: [
          {
            tag: {
              connectOrCreate: {
                where: { label: 'tag2' },
                create: { label: 'tag2' },
              },
            },
          },
          {
            tag: {
              connectOrCreate: {
                where: { label: 'tag3' },
                create: { label: 'tag3' },
              },
            },
          }
        ]
      }
    },
    {
      title: 'Test3',
      description: 'Test3 Description',
      done: false,
    },
    {
      title: 'Test4',
      description: 'Test4 Description',
      done: false,
    },
    {
      title: 'Test5',
      description: 'Test5 Description',
      done: false,
    },
    {
      title: 'Test6',
      description: 'Test6 Description',
      done: false,
    },
    {
      title: 'Test7',
      description: 'Test7 Description',
      done: false,
    },
    {
      title: 'Test8',
      description: 'Test8 Description',
      done: false,
    },
    {
      title: 'Test9',
      description: 'Test9 Description',
      done: false,
    },
    {
      title: 'Test10',
      description: 'Test10 Description',
      done: false,
    },
    {
      title: 'Test11',
      description: 'Test11 Description',
      done: false,
    },
    {
      title: 'Test12',
      description: 'Test12 Description',
      done: false,
    },
  ]

  for (let i = 0; i < tasks.length; ++i) {
    const task = tasks[i]
    console.log('task', task)
    const id = i + 1
    const param = {
      where: { id: id },
      update: task,
      create: task,
    }
    console.log('params', param)
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
