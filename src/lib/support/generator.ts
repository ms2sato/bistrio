import path from 'path'
import fs from 'fs'
import { RouteConfig, Router, RouterOptions } from '../../client'
import { Config, ConfigCustom, fillConfig, Middlewares, nullRouterSupport, RouterSupport } from '../..'

class NameToPathRouter implements Router {
  constructor(private httpPath: string = '/', readonly nameToPath: { [path: string]: string } = {}) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    return new NameToPathRouter(path.join(this.httpPath, rpath), this.nameToPath)
  }

  options(_value: RouterOptions) {
    return this
  }

  resources(rpath: string, config: RouteConfig): void {
    this.nameToPath[config.name] = path.join(this.httpPath, rpath)
  }

  createNameToPath({ out }: { out: string }) {
    const text = `export type NameToPath = {
  ${Object.keys(this.nameToPath)
    .map((name) => `${name}: '${this.nameToPath[name]}'`)
    .join('\n  ')}
}
`

    fs.writeFileSync(out, text)
  }

  createResources({ out }: { out: string }) {
    const ret = `${Object.keys(this.nameToPath)
      .map(
        (name, index) =>
          `import type __Resource${index} from '../../../server/endpoint${this.nameToPath[name]}/resource'`
      )
      .join('\n')}

export type Resources = {
  ${Object.keys(this.nameToPath)
    .map((name, index) => `'${this.nameToPath[name]}': ReturnType<typeof __Resource${index}>`)
    .join('\n  ')}
}
`
    fs.writeFileSync(out, ret)
  }

  createTypes({ out }: { out: string }) {
    const ret = `import { useRenderSupport as useRenderSupportT, RenderSupport as RenderSupportT, NameToResource } from 'bistrio/client'
import { type NameToPath } from './_name_to_path'
import { type Resources } from './_resources'

export type N2R = NameToResource<Resources, NameToPath>
export type RenderSupport = RenderSupportT<N2R>
export const useRenderSupport = useRenderSupportT<N2R>
`
    fs.writeFileSync(out, ret)
  }

  createEntry({ out, name, config }: { out: string; name: string; config: Config }) {
    const outDir = path.dirname(out)
    const isomorphicConfigPath = path.relative(outDir, path.resolve(config.structure.isomorphicDir, 'config'))
    const localesPath = path.relative(outDir, path.resolve(config.structure.isomorphicDir, 'locales'))
    const ret = `import { entry } from 'bistrio/client'

import { entriesConfig, clientConfig } from '${isomorphicConfigPath}'
import { N2R } from './index'
import { localeMap } from '${localesPath}'

entry<N2R>({
  entriesConfig,
  name: "${name}",
  localeMap,
  clientConfig
}).catch((err) => {
  console.error(err)
})
`
    fs.writeFileSync(out, ret)
  }
}

export async function generate<M extends Middlewares>({
  config: configCustom,
  allRoutes,
}: {
  config: ConfigCustom
  allRoutes: (router: Router, support: RouterSupport<M>) => void
}) {
  console.log('Generating...')

  const config = fillConfig(configCustom)
  const entriesConfig = config.entries

  const bistrioRoot = config.structure.buildDir
  if (!fs.existsSync(bistrioRoot)) {
    fs.mkdirSync(bistrioRoot)
  }

  const bistrioGenRoot = path.join(bistrioRoot, 'routes')
  if (!fs.existsSync(bistrioGenRoot)) {
    fs.mkdirSync(bistrioGenRoot)
  }

  await Promise.all(
    Object.entries(entriesConfig).map(([name, { routes }]) => {
      return generateForEntry(bistrioGenRoot, name, routes, config)
    })
  )

  generateForAll(bistrioGenRoot, allRoutes)

  console.log('Generated!')
}

const router = new NameToPathRouter()
function generateForEntry<M extends Middlewares>(
  bistrioGenRoot: string,
  name: string,
  routes: (router: Router, support: RouterSupport<M>) => void,
  config: Config
) {
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = path.join(bistrioGenRoot, name)
  if (!fs.existsSync(genRoot)) {
    fs.mkdirSync(genRoot)
  }

  router.createNameToPath({ out: path.join(genRoot, '_name_to_path.ts') })
  router.createResources({ out: path.join(genRoot, '_resources.ts') })
  router.createTypes({ out: path.join(genRoot, 'index.ts') })
  router.createEntry({ out: path.join(genRoot, '_entry.ts'), name, config })
}

function generateForAll<M extends Middlewares>(
  bistrioGenRoot: string,
  routes: (router: Router, support: RouterSupport<M>) => void
) {
  const name = 'all'

  const router = new NameToPathRouter()
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = path.join(bistrioGenRoot, name)
  if (!fs.existsSync(genRoot)) {
    fs.mkdirSync(genRoot)
  }

  router.createNameToPath({ out: path.join(genRoot, '_name_to_path.ts') })
  router.createResources({ out: path.join(genRoot, '_resources.ts') })
  router.createTypes({ out: path.join(genRoot, 'index.ts') })
}
