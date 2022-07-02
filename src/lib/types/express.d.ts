import { Localizer } from '../shared/locale'

declare global {
  namespace Express {
    interface Request {
      localizer?: Localizer
    }
  }
}
