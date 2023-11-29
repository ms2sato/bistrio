import { resolve, dirname } from 'node:path'
import { ConfigCustom } from 'bistrio'
import { entriesConfig, clientConfig } from '../universal/config/index.ts'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const config: ConfigCustom = {
  structure: {
    baseDir: resolve(__dirname, '../'),
    configDir: __dirname,
  },
  entries: entriesConfig,
  client: clientConfig,
}
