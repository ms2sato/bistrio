import { boot } from '../lib/boot'

import { routes } from '../routes/admin'
import { views } from '../.bistrio/generated/admin/_views'
import { N2R } from '../.bistrio/generated/admin/_types'

boot<N2R>({
  routes,
  views,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
