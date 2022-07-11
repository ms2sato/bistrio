import path from 'path'
import { support } from 'bistrio'

import { entries } from '../routes/_entries'
import { routes as allRoutes } from '../routes/all'

const main = async () => {
  const projectRoot = path.resolve(__dirname, '..')
  await support.generate({ projectRoot, entries, allRoutes })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
