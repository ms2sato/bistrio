import { Localizer } from '../lib/shared/locale'

declare global {
  namespace Express {
    interface Request {
      localizer?: Localizer
    }
  }
}
