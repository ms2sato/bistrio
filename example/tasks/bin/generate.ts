import path from 'path'
import { support } from 'bistrio'

import { entriesConfig } from '../isomorphic/config'
import { routes as allRoutes } from '../isomorphic/routes/all'

const main = async () => {
  const projectRoot = path.resolve(__dirname, '..')
  await support.generate({ projectRoot, entriesConfig, allRoutes })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
