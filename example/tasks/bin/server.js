const { setup } = require('../dist/server/app')
const { support } = require('bistrio')

async function main() {
  const app = await setup()
  await support.boot(app)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
