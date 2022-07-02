import { boot } from 'bistrio/client'

import { routes } from '../routes/main'
import { views } from '../.bistrio/routes/main/_views'
import { N2R } from '../.bistrio/routes/main/_types'
import { localeMap } from '../locales'

boot<N2R>({
  routes,
  views,
  localeMap,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
