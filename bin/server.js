const app = require('../dist/server/app')
const { boot } = require('../dist/server/support/boot')
boot(app.default)
