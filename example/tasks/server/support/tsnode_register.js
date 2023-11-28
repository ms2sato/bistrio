import { register } from 'ts-node'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

register({ project: resolve(__dirname, '../../config/tsconfig.tsnode.json'), esm: true })
