import path from 'path'
import { support } from 'bistrio'

import { entries } from '../routes/_entries'
import { routes as allRoutes } from '../routes/all'

try {
  const projectRoot = path.resolve(__dirname, '..')
  support.generate({ projectRoot, entries, allRoutes })
} catch (err) {
  console.error(err)
  process.exit(1)
}
