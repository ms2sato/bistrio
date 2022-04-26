const { setup } = require('../dist/server/app')
const { boot } = require('../dist/server/support/boot')
setup()
  .then((app) => {
    boot(app)
  })
  .catch((err) => {
    console.error(err)
  })
