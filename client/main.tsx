import { boot } from '../lib/boot'

import { routes } from '../routes/main'
import { views } from '../.bistrio/generated/main/_views'
import { N2R } from '../.bistrio/generated/main/_types'

boot<N2R>({
  routes,
  views,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
