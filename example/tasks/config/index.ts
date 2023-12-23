import { resolve, dirname } from 'node:path'
import { ConfigCustom } from 'bistrio'
import { entriesConfig, clientConfig } from '../universal/config'

export const config: ConfigCustom = {
  structure: {
    baseDir: resolve('./'),
    configDir: resolve('./config'),
  },
  entries: entriesConfig,
  client: clientConfig,
}
