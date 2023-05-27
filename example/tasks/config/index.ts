import path from 'path'
import { ConfigCustom } from 'bistrio'
import { entriesConfig, clientConfig } from '../isomorphic/config'

export const config: ConfigCustom = {
  structure: {
    baseDir: path.resolve(__dirname, '../'),
    configDir: __dirname,
  },
  entries: entriesConfig,
  client: clientConfig,
}
