import { setup } from './app'
import { support } from 'bistrio'

async function boot() {
  const app = await setup()
  support.boot(app)
}

boot().catch((err) => {
  console.error(err)
  process.exit(1)
})
