import { generate } from '../support/generator'

generate().catch((err) => {
  console.error(err)
  process.exit(1)
})
