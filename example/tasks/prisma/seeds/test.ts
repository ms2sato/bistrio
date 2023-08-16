import { PrismaClient } from '@prisma/client'
import { hash } from '../../server/lib/crypter'

const env = process.env.NODE_ENV || 'development'

export default async function seed(prisma: PrismaClient) {
  if (env === 'production') {
    throw new Error('[CAUTION!]cannot seed on NODE_ENV=production')
  }

  const users = [
    {
      username: 'admin',
      role: 9,
    },
    {
      username: 'user1',
      role: 0,
    },
    {
      username: 'user2',
      role: 0,
    },
  ]

  for (let i = 0; i < users.length; ++i) {
    const hashedPassword = await hash('password')

    const user = users[i]
    const id = i + 1
    const param = {
      where: { id: id },
      update: { ...user, hashedPassword },
      create: { ...user, hashedPassword },
    }
    console.log(await prisma.user.upsert(param))
  }
}
