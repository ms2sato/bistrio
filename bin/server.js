const { setup } = require('../dist/server/app')
const { boot } = require('../dist/server/support/boot')
boot(await setup())
