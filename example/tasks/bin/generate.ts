import { support } from 'bistrio'

import { config } from '../config/index.ts'
import { routes as allRoutes } from '../isomorphic/routes/all.ts'

const main = async () => {
  await support.generate({ config, allRoutes })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
