// for REPL
const { support } = require('bistrio')
const { routes } = require('../dist/universal/routes/all.js')
const { serverRouterConfig } = require('../dist/server/config/server.js')

support.loadResources(serverRouterConfig(), routes).catch((err) => {
  console.error(`console error: ${err.message}`)
})
