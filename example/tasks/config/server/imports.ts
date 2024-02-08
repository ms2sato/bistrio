import { ComponentType } from 'react'
import { FileNotFoundError } from 'bistrio'
import { lazy } from '@/server/lib/lazy'

export async function importLocal(filePath: string) {
  try {
    return await import(/* webpackMode: "eager" */ `../../server/resources${filePath}`)
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

export function loadPage(filePath: string) {
  try {
    return lazy(async () => {
      console.log('#### import', filePath)
      const { Page } = await import(`../../universal/pages${filePath}`)
      return { default: Page as ComponentType<any> }

      // console.log('### key', `./universal/pages${filePath}`)
      // delete require.cache[`./universal/pages${filePath}`]
      // delete require.cache['./universal sync recursive ^\\.\\/pages.*$']

      // console.log(require.cache)

      // return new Promise((resolve, reject) => {
      //   require.ensure([], function (require) {
      //     var Page = require(`../../universal/pages${filePath}`).Page
      //     console.log('#### Page', Page.toString())
      //     resolve({ default: Page as ComponentType<any> })
      //   })
      // })
    })
  } catch (err) {
    throw new FileNotFoundError(filePath, { cause: err })
  }
}

// export function loadPage(filePath: string) {
//   try {
//     return lazy(async () => {
//       // if (process.env.NODE_ENV === 'development') {
//       // delete require.cache[require.resolve(`../../universal/pages${filePath}`)];
//       // const { Page } = await require(
//       //   `../../universal/pages${filePath}`
//       // )
//       // return { default: Page as ComponentType<any> }
//       // } else {
//       //   const { Page } = await import(/* webpackMode: "eager" */ `../../universal/pages${filePath}`)
//       //   return { default: Page as ComponentType<any> }
//       // }

//       delete require.cache[`./universal/pages${filePath}`]
//       delete require.cache['./universal sync recursive ^\\.\\/pages.*$']
//       //console.log(require.cache)
//       // var pageContext = require.context('../../universal/pages', true, /\.js$/)
//       // var Page = pageContext(`.${filePath}`).Page
//       // return { default: Page as ComponentType<any> }
//       return new Promise((resolve, reject) => {
//         require.ensure([], function (require) {
//           var Page = require(`../../universal/pages${filePath}`).Page
//           resolve({ default: Page as ComponentType<any> })
//         })
//       })
//     })
//   } catch (err) {
//     throw new FileNotFoundError(filePath, { cause: err })
//   }
// }
