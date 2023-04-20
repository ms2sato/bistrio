import path from 'path'
import { entries } from '../../isomorphic/config'
import { generateWebpackCoonfig } from 'bistrio'

const baseDir = path.resolve(__dirname, '../..')

const generateWebpackCoonfigParams = {
  entries,
  baseDir,
  // generateEntry: () => {
  //   const entry = Object.keys(entries).reduce<webpack.EntryObject>((obj, name) => {
  //     obj[name] = path.resolve(buildDir, `routes/${name}/_entry.ts`)
  //     return obj
  //   }, {})
  //   return entry
  // },
}


const webpackConfig = generateWebpackCoonfig(generateWebpackCoonfigParams)

export default webpackConfig
