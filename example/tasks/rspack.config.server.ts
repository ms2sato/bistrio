import path from 'path'
import { fileURLToPath } from 'node:url'
import { Configuration } from '@rspack/cli'
const __dirname = path.dirname(fileURLToPath(import.meta.url))

const config: Configuration = {
  target: 'node',
  entry: [path.join(__dirname, `bin/dev.ts`)],
  output: {
    filename: 'server/server.cjs',
  },
  resolve: {
    tsConfigPath: path.join(__dirname, './tsconfig.json'),
    alias: {
      '@': path.join(__dirname),
      '@bistrio': path.join(__dirname, '.bistrio'),
      '@isomorphic': path.join(__dirname, 'isomorphic'),
      '@server': path.join(__dirname, 'server'),
    },
  },
  externals: [
    function (obj: any, callback: any) {
      const resource = obj.request
      const lazyImports = [
        'node-gyp',
        'npm',
        'aws-sdk',
        'mock-aws-s3',
        'nock',
        'enhanced-resolve/lib/createInnerCallback',
      ]
      if (!lazyImports.includes(resource)) {
        return callback()
      }
      try {
        require.resolve(resource)
      } catch (err) {
        callback(null, resource)
      }
      callback()
    },
  ],
}

export default config
