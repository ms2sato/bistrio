import path from 'path'
import { entries } from '../../isomorphic/routes/_entries'
import { generateWebpackCoonfig } from 'bistrio'

const webpackConfig = generateWebpackCoonfig({ entries, baseDir: path.join(__dirname, '../..') })

export default webpackConfig
