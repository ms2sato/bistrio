import { setup } from './app'
import { support } from 'bistrio'

async function boot() {
  const app = await setup()
  const server = support.boot(app)

  if (module.hot) {
    console.log('########## module.hot')
    module.hot.addStatusHandler((status) => {
      console.log('########## status', status)
    })

    module.hot
      .check()
      .then((outdatedModules) => {
        console.log('########## outdatedModules', outdatedModules)
      })
      .catch((error) => {
        console.error('########## error', error)
      })

    module.hot.accept()
    // () => {
    //   ;(async () => {
    //     server.removeListener('request', app)
    //     app = await setup()
    //     server.on('request', app)
    //     console.log('!!!!!!!!!!!!!!!!!!! Server reloaded!')
    //   })().catch((err) => {
    //     console.error(err)
    //     process.exit(1)
    //   })
    // }
    module.hot.dispose(() => server.close())
  }
}

boot().catch((err) => {
  console.error(err)
  process.exit(1)
})
