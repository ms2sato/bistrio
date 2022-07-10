import { entry } from 'bistrio/client'

import { routes } from '@/routes/admin'
import { views } from '@bistrio/routes/admin/_views'
import { N2R } from '@bistrio/routes/admin/_types'
import { localeMap } from '@/locales'

entry<N2R>({
  routes,
  views,
  localeMap,
  container: document.getElementById('app'),
}).catch((err) => {
  console.error(err)
})
