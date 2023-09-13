import path from "node:path";
import { fileURLToPath } from "node:url";
import { ConfigCustom } from 'bistrio'
import { entriesConfig, clientConfig } from '../isomorphic/config/index.ts'
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const config: ConfigCustom = {
  structure: {
    baseDir: path.resolve(__dirname, '../'),
    configDir: __dirname,
  },
  entries: entriesConfig,
  client: clientConfig,
}
