import path from 'path'
import { generateWebpackConfig } from 'bistrio'
import { entries } from '../../isomorphic/routes/_entries'
import { Configuration } from 'webpack'

const webpackConfig: Configuration = generateWebpackConfig({ entries, baseDir: path.join(__dirname, '../..') })

export default webpackConfig
