import path from 'path'
import fs from 'fs'
import { RouteConfig, Router } from 'restrant2/client'

import { entries } from '../routes/_entries'
import { routes as allRoutes } from '../routes/all'
import { glob } from 'glob'

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
      .map((vpath, index) => `import { Page as __Page${index} } from '../../../${vpath.replace(/\.tsx$/, '')}'`)
      .join('\n')}

export const views = {
  ${targets
    .map(
      (vpath, index) =>
        `"${vpath
          .replace(viewPath, '')
          .replace(/index\.tsx$/, '')
          .replace(/\.tsx$/, '')}": __Page${index}`
    )
    .join(',\n  ')}
}
`
    fs.writeFileSync(out, ret)
  }

  createTypes({ out }: { out: string }) {
    const ret = `import { type Resource } from 'restrant2/client'
import { PageProps as TPageProps } from '../../../lib/render-support'
import { type NameToPath } from './_name_to_path'
import { type Resources } from './_resources'

export type ResourcesT = {
  [path: string]: Resource
}

export type NameToPathT = {
  [name: string]: string
}

type NameToResource<R extends ResourcesT, NP extends NameToPathT> = {
  [name in keyof NP]: R[NP[name]]
}

export type N2R = NameToResource<Resources, NameToPath>
export type PageProps = TPageProps<N2R>
`
    fs.writeFileSync(out, ret)
  }
}

export async function generate(projectRoot = path.resolve(__dirname, '..')) {
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
    Object.entries(entries).map(([name, routes]) => {
      return generateForEntry(bistrioGenRoot, name, routes)
    })
  )

  await generateForEntry(bistrioGenRoot, 'all', allRoutes)

  console.log('Generated!')
}

async function generateForEntry(bistrioGenRoot: string, name: string, routes: (router: Router) => void) {
  const router = new NameToPathRouter()
  routes(router)

  const genRoot = path.join(bistrioGenRoot, name)
  if (!fs.existsSync(genRoot)) {
    fs.mkdirSync(genRoot)
  }

  router.createNameToPath({ out: path.join(genRoot, '_name_to_path.ts') })
  await router.createViews({ out: path.join(genRoot, '_views.ts'), viewPath: 'views' })
  router.createResources({ out: path.join(genRoot, '_resources.ts') })
  router.createTypes({ out: path.join(genRoot, '_types.ts') })
}
