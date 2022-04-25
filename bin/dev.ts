import { setup } from '../server/app'
import { boot } from '../server/support/boot'

setup()
  .then((app) => {
    boot(app)
  })
  .catch((err) => {
    console.error(err)
  })
