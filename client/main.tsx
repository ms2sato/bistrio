import { boot } from '../lib/boot'

import { routes } from '../routes/main'
import { views } from '../.bistrio/generated/main/_views'
import { N2R } from '../.bistrio/generated/main/_types'
import { localeMap } from '../locales'

boot<N2R>({
  routes,
  views,
  localeMap,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
