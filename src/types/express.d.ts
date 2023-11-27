import { Localizer } from '../lib/shared/locale.js'

declare global {
  namespace Express {
    interface Request {
      localizer?: Localizer
    }
  }
}
