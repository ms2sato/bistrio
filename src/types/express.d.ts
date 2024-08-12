import { ExtendedServerResponse } from 'webpack-dev-middleware'
import { Localizer } from '../lib/shared/locale.js'

declare global {
  namespace Express {
    interface Request {
      localizer?: Localizer
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Response extends ExtendedServerResponse {}
  }
}
