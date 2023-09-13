import { support } from 'bistrio'
import { setup } from '../server/app.ts'

setup()
  .then((app) => {
    support.boot(app)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
