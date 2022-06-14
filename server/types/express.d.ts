import { Localizer } from '../../lib/locale'

declare global {
  namespace Express {
    interface Request {
      localizer?: Localizer
    }
  }
}
