import { support } from 'bistrio'

import { config } from '../config'
import { routes as allRoutes } from '../universal/routes/all'

const main = async () => {
  await support.generate({ config, allRoutes })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
