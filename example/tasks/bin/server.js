const { setup } = require('../dist/server/app')
const { boot } = require('../dist/server/support/boot')

async function main() {
  const app = await setup()
  await boot(app)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
