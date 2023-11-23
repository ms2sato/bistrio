import { setup } from './app'
import { support } from 'bistrio'

async function main() {
  const app = await setup()
  support.boot(app)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
