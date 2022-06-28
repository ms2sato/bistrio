import path from 'path'
import fs from 'fs'
import glob from 'glob'
import { RouteConfig, Router } from 'restrant2/client'

import { routes } from '../routes'

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
        (name, index) => `import type __Resource${index} from '../../server/endpoint${this.nameToPath[name]}/resource'`
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
}

function initRouter() {
  const router = new NameToPathRouter()
  routes(router)
  return router
}

function createViews({ out, projectRoot, viewPath }: { out: string; projectRoot: string; viewPath: string }) {
  const viewRoot = path.join(projectRoot, viewPath)

  return new Promise((resolve, reject) => {
    glob(
      path.join(viewRoot, '/**/*.tsx'),
      { ignore: [path.join(viewRoot, '/**/_*.tsx'), path.join(viewRoot, '/error.tsx')] },
      (err, files) => {
        if (err) {
          return reject(err)
        }
        const relativeViewPaths = files.map((vpath) => path.relative(viewRoot, vpath))

        const ret = `${relativeViewPaths
          .map(
            (vpath, index) =>
              `import { Page as __Page${index} } from '../../${path.join(viewPath, vpath.replace(/\.tsx$/, ''))}'`
          )
          .join('\n')}

export const views = {
  ${relativeViewPaths.map((vpath, index) => `"${vpath.replace(/\.tsx$/, '')}": __Page${index}`).join(',\n  ')}
}
`
        fs.writeFileSync(out, ret)
        resolve(ret)
      }
    )
  })
}

export async function generate(projectRoot = path.resolve(__dirname, '..')) {
  console.log('Generating...')

  const bistrioRoot = path.join(projectRoot, '.bistrio')
  if (!fs.existsSync(bistrioRoot)) {
    fs.mkdirSync(bistrioRoot)
  }

  const bistrioGenRoot = path.join(bistrioRoot, 'generated')
  if (!fs.existsSync(bistrioGenRoot)) {
    fs.mkdirSync(bistrioGenRoot)
  }

  const router = initRouter()
  router.createNameToPath({ out: path.join(bistrioGenRoot, '_name_to_path.ts') })
  await createViews({ out: path.join(bistrioGenRoot, '_views.ts'), projectRoot, viewPath: './views' })
  router.createResources({ out: path.join(bistrioGenRoot, '_resources.ts') })

  console.log('Generated!')
}
