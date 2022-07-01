import { boot } from '../lib/boot'

import { routes } from '../routes/admin'
import { views } from '../.bistrio/routes/admin/_views'
import { N2R } from '../.bistrio/routes/admin/_types'
import { localeMap } from '../locales'

boot<N2R>({
  routes,
  views,
  localeMap,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
