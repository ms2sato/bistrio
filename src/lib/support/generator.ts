import path from 'path'
import fs from 'fs'
import { RouteConfig, Router } from 'restrant2/client'

import { glob } from 'glob'
import { EntriesConfig, Middlewares, nullRouterSupport, RouterSupport } from '../../index'

// TODO: to config
const entriesPath = '../../../isomorphic/config'
const localesPath = '../../../isomorphic/locales'
const viewPath = 'isomorphic/views'

class NameToPathRouter implements Router {
  constructor(private httpPath: string = '/', readonly nameToPath: { [path: string]: string } = {}) {}

  sub(rpath: string, ..._args: unknown[]): Router {
    return new NameToPathRouter(path.join(this.httpPath, rpath), this.nameToPath)
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

  async createViews({ out, viewPath }: { out: string; viewPath: string }) {
    const files = await new Promise<string[]>((resolve, reject) => {
      glob(path.join(viewPath, '**/*.tsx'), { ignore: [path.join(viewPath, '**/_*.tsx')] }, (err, files) => {
        if (err) {
          return reject(err)
        }
        resolve(files)
      })
    })

    const targets = files.filter((file) =>
      Object.values(this.nameToPath).some((path) => file.replace(viewPath, '').startsWith(path))
    )

    const ret = `${targets
      .map((vpath, index) => `import * as __page${index} from '../../../${vpath.replace(/\.tsx$/, '')}'`)
      .join('\n')}

export const views = {
  ${targets
    .map(
      (vpath, index) =>
        `"${vpath
          .replace(viewPath, '')
          .replace(/index\.tsx$/, '')
          .replace(/\.tsx$/, '')}": __page${index}`
    )
    .join(',\n  ')}
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

  createEntry({ out, name }: { out: string; name: string }) {
    const ret = `import { entry } from 'bistrio/client'

import { entries } from '${entriesPath}'
import { N2R } from './index'
import { localeMap } from '${localesPath}'

entry<N2R>({
  entries,
  name: "${name}",
  localeMap,
}).catch((err) => {
  console.error(err)
})
`
    fs.writeFileSync(out, ret)
  }
}

export async function generate<M extends Middlewares>({
  projectRoot = path.resolve(__dirname, '..'),
  entries,
  allRoutes,
}: {
  projectRoot: string
  entries: EntriesConfig
  allRoutes: (router: Router, support: RouterSupport<M>) => void
}) {
  console.log('Generating...')

  const bistrioRoot = path.join(projectRoot, '.bistrio')
  if (!fs.existsSync(bistrioRoot)) {
    fs.mkdirSync(bistrioRoot)
  }

  const bistrioGenRoot = path.join(bistrioRoot, 'routes')
  if (!fs.existsSync(bistrioGenRoot)) {
    fs.mkdirSync(bistrioGenRoot)
  }

  await Promise.all(
    Object.entries(entries).map(([name, { routes }]) => {
      return generateForEntry(bistrioGenRoot, name, routes)
    })
  )

  generateForAll(bistrioGenRoot, allRoutes)

  console.log('Generated!')
}

const router = new NameToPathRouter()
async function generateForEntry<M extends Middlewares>(
  bistrioGenRoot: string,
  name: string,
  routes: (router: Router, support: RouterSupport<M>) => void
) {
  routes(router, nullRouterSupport as RouterSupport<M>)

  const genRoot = path.join(bistrioGenRoot, name)
  if (!fs.existsSync(genRoot)) {
    fs.mkdirSync(genRoot)
  }

  router.createNameToPath({ out: path.join(genRoot, '_name_to_path.ts') })
  await router.createViews({ out: path.join(genRoot, '_views.ts'), viewPath: viewPath })
  router.createResources({ out: path.join(genRoot, '_resources.ts') })
  router.createTypes({ out: path.join(genRoot, 'index.ts') })
  router.createEntry({ out: path.join(genRoot, '_entry.ts'), name })
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
